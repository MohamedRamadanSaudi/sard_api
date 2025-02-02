import { Controller, Get, Query, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('paymob')
export class PaymobController {
  constructor(private prisma: PrismaService) { }

  @Get('webhook')
  async handleWebhook(@Query() query: any) {
    const { order, success } = query;

    // Ensure the 'order' and 'success' parameters exist
    if (!order || !success) {
      throw new NotFoundException('Invalid webhook data');
    }

    // Find the order by paymentId or any other relevant identifier (adjust if needed)
    const existingOrder = await this.prisma.order.findFirst({
      where: { paymentId: order.toString() },
    });

    if (!existingOrder) {
      throw new NotFoundException('Order not found');
    }

    // Update the order status
    await this.prisma.order.update({
      where: { id: existingOrder.id },
      data: { status: success === 'true' ? 'completed' : 'failed' }, // Convert 'true'/'false' to boolean
    });

    return { success: true };
  }
}
