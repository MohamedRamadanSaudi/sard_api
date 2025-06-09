import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from 'src/prisma/prisma.service';
import { MailsService } from 'src/mails/mails.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PaymobService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly iframeId: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private mailsService: MailsService
  ) {
    this.apiKey = this.configService.get<string>('PAYMOB_API_KEY');
    this.baseUrl = 'https://accept.paymob.com/api';
    this.iframeId = this.configService.get<string>('PAYMOB_IFRAME_ID');
  }

  async authenticate(): Promise<string> {
    const response = await axios.post(`${this.baseUrl}/auth/tokens`, {
      api_key: this.apiKey,
    });
    return response.data.token;
  }

  async createPaymentOrder(
    amount: number,
    currency: string = 'EGP',
  ): Promise<string> {
    const authToken = await this.authenticate();
    const response = await axios.post(`${this.baseUrl}/ecommerce/orders`, {
      auth_token: authToken,
      amount_cents: amount * 100, // PayMob expects amount in cents
      currency,
    });
    return response.data.id;
  }

  async generatePaymentKey(
    orderId: string,
    amount: number,
    billingData: any,
  ): Promise<string> {
    const authToken = await this.authenticate();

    if (!orderId) {
      throw new Error('Invalid order ID from PayMob');
    }

    try {
      const response = await axios.post(`${this.baseUrl}/acceptance/payment_keys`, {
        auth_token: authToken,
        amount_cents: amount * 100,
        order_id: orderId,
        billing_data: {
          first_name: billingData.first_name || 'Test',
          last_name: billingData.last_name || 'User',
          email: billingData.email || 'test@example.com',
          phone_number: billingData.phone_number || '01012345678',
          country: billingData.country || 'EG',
          city: billingData.city || 'Cairo',
          street: billingData.street || '123 Street',
          building: billingData.building || '123',
          floor: billingData.floor || '1',
          apartment: billingData.apartment || '1',
        },
        currency: 'EGP',
        integration_id: this.configService.get<string>('PAYMOB_INTEGRATION_ID'),
      });

      return response.data.token;
    } catch (error) {
      console.error('Paymob Error:', error.response?.data || error.message);
      throw new Error('Failed to generate payment key');
    }
  }

  async createPaymentUrl(
    orderId: string,
    amount: number,
    billingData: any,
  ): Promise<string> {
    const paymentKey = await this.generatePaymentKey(orderId, amount, billingData);
    return `https://accept.paymob.com/api/acceptance/iframes/${this.iframeId}?payment_token=${paymentKey}`;
  }

  /**
   * Handle Paymob webhook request
   */
  async handleWebhook(query: any): Promise<{ htmlContent: string }> {
    const { order, success, 'data.message': errorMessage, txn_response_code } = query;

    // Ensure the 'order' parameter exists
    if (!order) {
      throw new NotFoundException('Invalid webhook data: Missing order ID');
    }

    // Find the order by paymentId
    const existingOrder = await this.prisma.order.findFirst({
      where: { paymentId: order.toString() },
      include: {
        book: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true
          }
        }
      }
    });

    if (!existingOrder) {
      throw new NotFoundException(`Order not found for paymentId: ${order}`);
    }

    const paymentSuccess = success === 'true';
    const newStatus = paymentSuccess ? 'completed' : 'failed';
    const errorMsg = paymentSuccess ? null : `${errorMessage || txn_response_code || 'Unknown error'}`;

    // Update the order with more detailed information
    const updatedOrder = await this.prisma.order.update({
      where: { id: existingOrder.id },
      data: {
        status: newStatus,
      },
      include: {
        book: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true
          }
        }
      }
    });

    // If payment is successful, add book to user's library
    if (paymentSuccess) {
      await this.prisma.user.update({
        where: { id: updatedOrder.userId },
        data: {
          myBooks: {
            connect: { id: updatedOrder.bookId },
          },
        },
      });
    }

    // Create retry payment URL if the payment failed
    let retryPaymentUrl = null;
    if (!paymentSuccess) {
      try {
        // Get user data for billing
        const user = await this.prisma.user.findUnique({
          where: { id: updatedOrder.userId }
        });

        // Define billing data for retry payment
        const billingData = {
          first_name: user.name,
          last_name: "",
          email: user.email,
          phone_number: user.phone,
        };

        // Generate new payment URL for retry
        retryPaymentUrl = await this.createPaymentUrl(
          order,
          updatedOrder.price,
          billingData
        );
      } catch (error) {
        console.error('Failed to generate retry payment URL:', error);
      }
    }

    // Send email notification about payment status
    try {
      await this.mailsService.sendOrderStatusUpdateEmail(
        updatedOrder.user.email,
        updatedOrder.id,
        updatedOrder.book.title,
        updatedOrder.user.name,
        newStatus,
        errorMsg,
        retryPaymentUrl
      );
    } catch (error) {
      console.error('Failed to send order status update email:', error);
      // Don't throw error to avoid disrupting the webhook response
    }

    // Get the appropriate HTML content based on payment status
    const htmlContent = this.getPaymentResponseHtml(paymentSuccess, errorMessage || txn_response_code, retryPaymentUrl);

    return { htmlContent };
  }

  /**
   * Get payment response HTML
   */  private getPaymentResponseHtml(success: boolean, errorMessage?: string, retryPaymentUrl?: string): string {
    try {
      // Define possible template paths (try multiple locations)
      const possiblePaths = [
        // Production path (compiled)
        path.join(process.cwd(), 'dist/paymob/templates', success ? 'payment-success.html' : 'payment-failed.html'),
        // Development path (source)
        path.join(process.cwd(), 'src/paymob/templates', success ? 'payment-success.html' : 'payment-failed.html'),
        // Try relative to __dirname
        path.join(__dirname, 'templates', success ? 'payment-success.html' : 'payment-failed.html')
      ];

      // Try each path until we find one that works
      let htmlContent = null;
      for (const templatePath of possiblePaths) {
        try {
          if (fs.existsSync(templatePath)) {
            htmlContent = fs.readFileSync(templatePath, 'utf8');
            console.log(`Found template at: ${templatePath}`);
            break;
          }
        } catch (err) {
          console.error(`Error reading template at ${templatePath}:`, err);
          continue;
        }
      }

      // If we didn't find any template file
      if (!htmlContent) {
        throw new Error('Template file not found in any location');
      }

      if (!success) {
        // Replace placeholders in failed payment template
        htmlContent = htmlContent.replace('{{errorMessage}}', errorMessage || 'خطأ غير معروف');

        const retryButton = retryPaymentUrl
          ? `<a href="${retryPaymentUrl}" class="button button-retry">إعادة المحاولة</a>`
          : '';

        htmlContent = htmlContent.replace('{{retryPaymentButton}}', retryButton);
      }

      return htmlContent;
    } catch (error) {
      console.error('Error loading HTML template:', error);
      // Fallback HTML when templates cannot be loaded
      if (success) {
        return `
          <!DOCTYPE html>
          <html dir="rtl" lang="ar">
          <head>
            <meta charset="UTF-8">
            <title>تم الدفع بنجاح - سرد</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 40px; }
              h1 { color: #4CAF50; }
            </style>
          </head>
          <body>
            <h1>تم الدفع بنجاح</h1>
            <p>تم إتمام عملية الدفع بنجاح. يمكنك الآن العودة إلى تطبيق سرد للاستماع إلى الكتاب.</p>
            <button onclick="window.close()">إغلاق هذه النافذة</button>
            <script>setTimeout(() => window.close(), 5000);</script>
          </body>
          </html>
        `;
      } else {
        return `
          <!DOCTYPE html>
          <html dir="rtl" lang="ar">
          <head>
            <meta charset="UTF-8">
            <title>فشل الدفع - سرد</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 40px; }
              h1 { color: #f44336; }
              .error { color: #d32f2f; background: #fff8f8; padding: 10px; border: 1px solid #ffebee; }
            </style>
          </head>
          <body>
            <h1>فشل عملية الدفع</h1>
            <p>للأسف، لم تتم عملية الدفع بنجاح.</p>
            <div class="error">${errorMessage || 'خطأ غير معروف'}</div>
            <div>
              ${retryPaymentUrl ? `<a href="${retryPaymentUrl}">إعادة المحاولة</a>` : ''}
              <button onclick="window.close()">إغلاق</button>
            </div>
          </body>
          </html>
        `;
      }
    }
  }
}