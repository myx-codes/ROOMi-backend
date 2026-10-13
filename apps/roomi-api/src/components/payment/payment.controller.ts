import { Body, Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Controller('webhooks/payme')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  public async handlePaymeWebhook(
    @Body() body: Record<string, unknown>,
    @Headers('authorization') authorization?: string,
  ): Promise<Record<string, unknown>> {
    this.assertPaymeAuth(authorization);
    return this.paymentService.handlePaymeJsonRpc(body);
  }

  private assertPaymeAuth(authorization?: string): void {
    const expected = process.env.PAYME_MERCHANT_KEY;
    if (!expected) return;
    if (!authorization?.startsWith('Basic ')) throw new UnauthorizedException('Payme auth required');

    const decoded = Buffer.from(authorization.slice('Basic '.length), 'base64').toString('utf8');
    if (!decoded.includes(expected)) throw new UnauthorizedException('Payme auth failed');
  }
}
