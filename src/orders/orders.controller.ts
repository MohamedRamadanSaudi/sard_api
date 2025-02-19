import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  // Patch,
  // Delete,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
// import { UpdateOrderDto } from './dto/update-order.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) { }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  create(@Req() req, @Body() createOrderDto: CreateOrderDto) {
    const userId = req.user.userId;
    return this.ordersService.create(userId, createOrderDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'user')
  findAll(@Req() req) {
    // if the user is an admin, return all orders and if the user is a user, return only their orders
    if (req.user.role === 'admin') {
      return this.ordersService.findAll();
    } else {
      const userId = req.user.userId;
      return this.ordersService.findMyOrders(userId);
    }
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'user')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Get(':id/book')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  findMyBook(@Param('id') id: string) {
    return this.ordersService.findMyBook(id);
  }

  // @Patch(':id')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('admin')
  // update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
  //   return this.ordersService.update(id, updateOrderDto);
  // }

  // @Delete(':id')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('admin')
  // remove(@Param('id') id: string) {
  //   return this.ordersService.remove(id);
  // }
}