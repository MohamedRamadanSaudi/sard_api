import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PaymobService } from 'src/paymob/paymob.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private paymobService: PaymobService,
    private configService: ConfigService,
  ) { }

  async create(userId: string, createOrderDto: CreateOrderDto) {
    const { bookId, price, points } = createOrderDto;

    // Check if the book exists
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) {
      throw new NotFoundException('Book not found');
    }

    // Create PayMob order
    const orderId = await this.paymobService.createPaymentOrder(price);

    // Define billing data (adjust as needed)
    const billingData = {
      first_name: "Test",
      last_name: "User",
      email: "test@example.com",
      phone_number: "01012345678",
      country: "EG",
      city: "Cairo",
      street: "123 Street",
    };

    // Generate Payment Key
    const paymentKey = await this.paymobService.generatePaymentKey(orderId, price, billingData);

    // Construct PayMob Payment URL
    const iframeId = process.env.PAYMOB_IFRAME_ID;
    const paymobUrl = `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentKey}`;

    // Create the order in the database
    const order = await this.prisma.order.create({
      data: {
        userId,
        bookId,
        price,
        points,
        paymentId: orderId.toString(),
      },
    });

    return { order, paymentUrl: paymobUrl };
  }

  async findAll(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { book: true },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { book: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async update(id: string, updateOrderDto: UpdateOrderDto) {
    return this.prisma.order.update({
      where: { id },
      data: updateOrderDto,
    });
  }

  async remove(id: string) {
    return this.prisma.order.delete({ where: { id } });
  }
}