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
      let data: any = null;
      
      // Step 1: Try verifying the webhook signature
      try {
        data = (this.payos as any).verifyPaymentWebhookData(webhookBody);
      } catch (verifyError) {
        this.logger.error('Webhook signature verification failed', verifyError.message);
        // Fallback: Securely query PayOS API using the orderCode
        if ((webhookBody as any)?.data?.orderCode) {
          const orderCode = (webhookBody as any).data.orderCode;
          try {
            const info = await (this.payos as any).getPaymentLinkInformation(orderCode);
            if (info && info.status === 'PAID') {
              this.logger.log(`Payment confirmed via API fallback for orderCode: ${orderCode}`);
              data = (webhookBody as any).data;
            }
          } catch (apiError) {
            this.logger.error('API Verification fallback failed', apiError.message);
          }
        }
      }
      
      // Step 2: Process the paid order if valid
      if (data) {
        const orderCode = data.orderCode;
        if (!orderCode) return { success: false, message: 'No order code in data' };

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
          this.logger.warn(`No booking found in Firestore with orderCode ${orderCode}`);
        }
      } else {
        this.logger.warn('Webhook data invalid or not PAID');
        return { success: false, message: 'Webhook ignored' };
      }
      
      // Always return success: true to acknowledge receipt to PayOS (so they stop retrying)
      return { success: true };
    } catch (e) {
      this.logger.error('Webhook processing failed at root level', e);
      return { success: false, message: e.message };
    }
  }
}
