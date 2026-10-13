import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AppService } from './app.service';
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  csrfCookieOptions,
  generateCsrfToken,
} from './components/auth/auth-cookie.util';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get(['/', 'healthz'])
  healthCheck(): {
    status: 'ok' | 'degraded';
    database: 'connected' | 'disconnected';
    uptime: number;
    timestamp: string;
  } {
    return this.appService.healthCheck();
  }

  @Get(['csrf-token', 'csrf'])
  csrfToken(@Res({ passthrough: true }) response: Response): { csrfToken: string } {
    const csrfToken = generateCsrfToken();

    response.cookie(CSRF_COOKIE_NAME, csrfToken, csrfCookieOptions());
    response.setHeader(CSRF_HEADER_NAME, csrfToken);

    return { csrfToken };
  }
}
