import { Controller, Get, Query, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MailsService } from 'src/mails/mails.service';

@Controller('paymob')
export class PaymobController {
  constructor(
    private prisma: PrismaService,
    private mailsService: MailsService
  ) { }
  @Get('webhook')
  async handleWebhook(@Query() query: any) {

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
        user: true
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
        user: true
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

    // Send email notification about payment status
    try {
      // Generate payment retry URL if payment failed
      const retryPaymentUrl = null;
      if (!paymentSuccess) {
        // TODO: generate a new payment URL for retry
      }

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

    return {
      status: paymentSuccess ? 'success' : 'failed',
      message: paymentSuccess ? 'Payment completed' : `Payment failed: ${errorMessage || txn_response_code || 'Unknown error'}`,
    };
  }
}
