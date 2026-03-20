import { Injectable, Logger } from '@nestjs/common';
import { PayOS } from '@payos/node';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private payos: PayOS;

  constructor(private readonly firebaseService: FirebaseService) {
    this.payos = new PayOS({
      clientId: process.env.PAYOS_CLIENT_ID || 'client-id',
      apiKey: process.env.PAYOS_API_KEY || 'api-key',
      checksumKey: process.env.PAYOS_CHECKSUM_KEY || 'checksum-key',
    });
  }

  async createPaymentLink(bookingId: string, amount: number, returnUrl?: string, cancelUrl?: string) {
    // orderCode must be a number <= 9007199254740991
    const orderCode = Number(String(Date.now()).slice(-6) + Math.floor(Math.random() * 1000));
    const fallbackReturnUrl = returnUrl || `app://staybook/return`;
    const fallbackCancelUrl = cancelUrl || `app://staybook/cancel`;

    const body = {
      orderCode: orderCode,
      amount: amount,
      description: `Staybook ${orderCode}`.substring(0, 25),
      returnUrl: fallbackReturnUrl,
      cancelUrl: fallbackCancelUrl,
    };
    
    try {
      const paymentLink = await this.payos.paymentRequests.create(body);
      
      await this.firebaseService.getFirestore().collection('bookings').doc(bookingId).update({
        orderCode: orderCode,
        paymentLinkId: paymentLink.paymentLinkId,
        paymentMethod: 'PAYOS',
      });

      return paymentLink;
    } catch (error) {
      this.logger.error('Error creating payment link', error);
      throw error;
    }
  }

  async handleWebhook(webhookBody: any) {
    this.logger.log('Received PayOS webhook');
    try {
      const data = (this.payos as any).verifyPaymentWebhookData(webhookBody);
      
      if (data && data.code === '00') {
        const orderCode = data.orderCode;
        if (!orderCode) return { success: false, message: 'No order code' };

        const bookings = await this.firebaseService.getFirestore()
          .collection('bookings')
          .where('orderCode', '==', Number(orderCode))
          .get();

        if (!bookings.empty) {
          const doc = bookings.docs[0];
          await doc.ref.update({
            status: 'paid',
            updatedAt: new Date(),
          });
          this.logger.log(`Booking ${doc.id} paid successfully via PayOS`);
        } else {
          this.logger.warn(`No booking found with orderCode ${orderCode}`);
        }
      }
      return { success: true };
    } catch (e) {
      this.logger.error('Webhook verification failed', e);
      return { success: false, message: e.message };
    }
  }
}
