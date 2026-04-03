import { Controller, Get, Redirect } from '@nestjs/common';
import { Public } from './auth/decorators/public.decorator';

@Controller()
export class AppController {
  @Public()
  @Get()
  @Redirect('/api/docs', 302)
  root() {
    // Redirects to Swagger documentation
  }
}

