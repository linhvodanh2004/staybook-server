import { Controller, Post, Body, Res, Req, HttpStatus } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-payment-link')
  async createPaymentLink(@Body() body: any) {
    try {
      const { bookingId, amount, returnUrl, cancelUrl } = body;
      const result = await this.paymentService.createPaymentLink(
        bookingId,
        amount,
        returnUrl,
        cancelUrl,
      );
      return { success: true, data: result };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  @Post('payos-webhook')
  async handlePayOSWebhook(@Body() body: any, @Res() res: any) {
    // PayOS requires sending a 200 response to acknowledge receipt
    try {
      const result = await this.paymentService.handleWebhook(body);
      return res.status(HttpStatus.OK).json(result);
    } catch (e) {
      return res.status(HttpStatus.OK).json({ success: false, message: e.message });
    }
  }
}
