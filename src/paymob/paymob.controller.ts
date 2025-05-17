import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { PaymobService } from './paymob.service';

@Controller('paymob')
export class PaymobController {
  constructor(private paymobService: PaymobService) { }

  @Get('webhook')
  async handleWebhook(@Query() query: any, @Res() response: Response) {
    // Delegate the webhook handling to the service
    const { htmlContent } = await this.paymobService.handleWebhook(query);

    // Send the HTML response
    response.set({
      'Content-Type': 'text/html',
      'Cache-Control': 'no-store',
    });

    response.send(htmlContent);
  }
}
