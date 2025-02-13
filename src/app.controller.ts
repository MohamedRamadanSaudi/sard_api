import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello() {
    const hello = this.appService.getHello();
    return {
      message: hello,
      timestamp: new Date().toISOString(),
    }
  }
}
