import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
// import { UpdateOrderDto } from './dto/update-order.dto';
import { PaymobService } from 'src/paymob/paymob.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private paymobService: PaymobService,
  ) { }

  async create(userId: string, createOrderDto: CreateOrderDto) {
    const { bookId } = createOrderDto;

    // Check if the book exists
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) {
      throw new NotFoundException('Book not found');
    }

    // Check if the user already owns the book
    const alreadyOwned = await this.prisma.order.findFirst({
      where: {
        bookId: bookId,
        userId: userId,
        status: 'completed',
      }
    });
    if (alreadyOwned) {
      throw new BadRequestException('You already own this book');
    }

    // Start transaction
    return this.prisma.$transaction(async (prisma) => {
      // If the book is free
      if (book.is_free) {
        // Create the order
        const order = await prisma.order.create({
          data: {
            userId,
            bookId,
            price: 0,
            points: 0,
            status: 'completed',
          },
        });

        // Add the book to user's myBooks
        await prisma.user.update({
          where: { id: userId },
          data: {
            myBooks: {
              connect: { id: bookId },
            },
          },
        });

        return { order, paymentUrl: null };
      }

      // If the book is by points
      if (book.price_points) {
        // Get user details to check points
        const user = await prisma.user.findUnique({ where: { id: userId } });

        // Check if the user has enough points
        if (user.points < book.price_points) {
          throw new BadRequestException('Not enough points');
        }

        // Deduct points from user
        await prisma.user.update({
          where: { id: userId },
          data: {
            points: user.points - book.price_points,
            myBooks: {
              connect: { id: bookId },
            },
          },
        });

        // Create the order
        const order = await prisma.order.create({
          data: {
            userId,
            bookId,
            price: 0,
            points: book.price_points,
            status: 'completed',
          },
        });

        return { order, paymentUrl: null };
      }

      // If the book requires payment
      if (book.price) {
        // Create PayMob order
        const orderId = await this.paymobService.createPaymentOrder(book.price);
        const user = await prisma.user.findUnique({ where: { id: userId } });
        // Define billing data
        const billingData = {
          first_name: user.name,
          last_name: "",
          email: user.email,
          phone_number: user.phone,
        };

        // Generate Payment Key
        const paymentKey = await this.paymobService.generatePaymentKey(
          orderId,
          book.price,
          billingData
        );

        // Construct PayMob Payment URL
        const iframeId = process.env.PAYMOB_IFRAME_ID;
        const paymobUrl = `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentKey}`;

        // Create the order in the database
        const order = await prisma.order.create({
          data: {
            userId,
            bookId,
            price: book.price,
            points: 0,
            paymentId: orderId.toString(),
            status: 'pending',
          },
        });

        return { order, paymentUrl: paymobUrl };
      }

      throw new BadRequestException('Invalid book pricing configuration');
    });
  }

  async findMyOrders(userId: string) {
    return this.prisma.order.findMany({
      where: {
        userId,
        status: 'completed',
      },
      select: {
        id: true,
        book: {
          select: {
            id: true,
            title: true,
            description: true,
            cover: true,
            Author: {
              select: {
                name: true,
              }
            }
          }
        }
      },
    });
  }

  async findMyBook(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: {
        book: {
          select: {
            title: true,
            description: true,
            cover: true,
            duration: true,
            audio: true,
            Author: {
              select: {
                name: true,
                photo: true,
              }
            },
            BookCategory: {
              select: {
                category: {
                  select: {
                    name: true,
                    photo: true,
                  }
                },
              }
            },
            rating: true,
            _count: {
              select: {
                reviews: true,
              }
            }
          }
        }
      },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async findAll() {
    return this.prisma.order.findMany({
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

  // async update(id: string, updateOrderDto: UpdateOrderDto) {
  //   return this.prisma.order.update({
  //     where: { id },
  //     data: updateOrderDto,
  //   });
  // }

  // async remove(id: string) {
  //   return this.prisma.order.delete({ where: { id } });
  // }
}