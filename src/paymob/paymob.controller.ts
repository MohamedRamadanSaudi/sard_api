import { Controller, Get, Query, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('paymob')
export class PaymobController {
  constructor(private prisma: PrismaService) { }

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
    });

    if (!existingOrder) {
      throw new NotFoundException(`Order not found for paymentId: ${order}`);
    }

    const paymentSuccess = success === 'true';

    // Update the order with more detailed information
    await this.prisma.order.update({
      where: { id: existingOrder.id },
      data: {
        status: paymentSuccess ? 'completed' : 'failed',
      },
    });

    return {
      status: paymentSuccess ? 'success' : 'failed',
      message: paymentSuccess ? 'Payment completed' : `Payment failed: ${errorMessage || txn_response_code || 'Unknown error'}`,
    };
  }
}
