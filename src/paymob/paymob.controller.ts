import { Controller, Post, Body, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('paymob')
export class PaymobController {
  constructor(private prisma: PrismaService) { }

  @Post('webhook')
  async handleWebhook(@Body() body: any) {
    const { order, success } = body.obj;

    // Find the order by paymentId
    const existingOrder = await this.prisma.order.findFirst({
      where: { paymentId: order.id.toString() },
    });

    if (!existingOrder) {
      throw new NotFoundException('Order not found');
    }

    // Update the order status
    await this.prisma.order.update({
      where: { id: existingOrder.id }, // Use `id` instead of `paymentId`
      data: { status: success ? 'completed' : 'failed' },
    });

    return { success: true };
  }
}
