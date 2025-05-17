import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
// import { UpdateOrderDto } from './dto/update-order.dto';
import { PaymobService } from 'src/paymob/paymob.service';
import { MailsService } from 'src/mails/mails.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private paymobService: PaymobService,
    private mailsService: MailsService,
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
    }    // Define transaction options with increased timeout (15 seconds)
    const transactionOptions = {
      maxWait: 15000, // 15 seconds maximum wait time
      timeout: 15000, // 15 seconds timeout
    };

    // Start transaction with increased timeout
    return this.prisma.$transaction(async (prisma) => {      // Process order based on book pricing type
      if (book.is_free) {
        return this.processFreeBookOrder(prisma, userId, bookId);
      }

      if (book.price_points) {
        return this.processPointsBookOrder(prisma, userId, bookId, book.price_points);
      }

      if (book.price) {
        return this.processPaymentBookOrder(prisma, userId, bookId, book.price);
      }

      throw new BadRequestException('Invalid book pricing configuration');
    }, transactionOptions);
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

  /**
 * Process a free book order
 */
  private async processFreeBookOrder(prisma: any, userId: string, bookId: string) {
    // Create the order
    const order = await prisma.order.create({
      data: {
        userId,
        bookId,
        price: 0,
        points: 0,
        status: 'completed',
      },
      include: {
        book: {
          include: {
            Author: true
          }
        },
        user: true
      }
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

    // Send order confirmation email
    await this.sendOrderEmail(
      order,
      'free',
      'completed'
    );

    return { order, paymentUrl: null };
  }
  /**
   * Process a book order using points
   */
  private async processPointsBookOrder(prisma: any, userId: string, bookId: string, pricePoints: number) {
    // Get user details to check points
    const user = await prisma.user.findUnique({ where: { id: userId } });

    // Check if the user has enough points
    if (user.points < pricePoints) {
      throw new BadRequestException('Not enough points');
    }    // Deduct points from user and connect book
    await prisma.user.update({
      where: { id: userId },
      data: {
        points: user.points - pricePoints,
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
        points: pricePoints,
        status: 'completed',
      },
      include: {
        book: {
          include: {
            Author: true
          }
        },
        user: true
      }
    });

    // Send order confirmation email
    await this.sendOrderEmail(
      order,
      'points',
      'completed',
      undefined,
      pricePoints
    );

    return { order, paymentUrl: null };
  }
  /**
   * Process a book order requiring payment
   */
  private async processPaymentBookOrder(prisma: any, userId: string, bookId: string, price: number) {
    // Create PayMob order
    const orderId = await this.paymobService.createPaymentOrder(price);
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
      price,
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
        price: price,
        points: 0,
        paymentId: orderId.toString(),
        status: 'pending',
      },
      include: {
        book: {
          include: {
            Author: true
          }
        },
        user: true
      }
    });

    // Send order confirmation email with payment link
    await this.sendOrderEmail(
      order,
      'payment',
      'pending',
      price,
      undefined,
      paymobUrl
    );

    return { order, paymentUrl: paymobUrl };
  }  /**
   * Send order confirmation email
   */
  private async sendOrderEmail(order: any, paymentType: 'free' | 'points' | 'payment', status: string, price?: number, points?: number, paymentUrl?: string) {
    try {
      await this.mailsService.sendOrderConfirmationEmail(
        order.user.email,
        order.id,
        order.book.title,
        order.user.name,
        order.book.Author.name,
        order.book.description,
        paymentType,
        status,
        price,
        points,
        paymentUrl
      );
    } catch (error) {
      console.error('Failed to send order confirmation email:', error);
      // Don't throw error to avoid disrupting the order process
    }
  }
}