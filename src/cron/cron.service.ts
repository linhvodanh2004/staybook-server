import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FirebaseService } from '../firebase/firebase.service';
import * as admin from 'firebase-admin';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(private readonly firebaseService: FirebaseService) {}

  // Run every 30 minutes
  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleCron() {
    this.logger.debug('Running periodic booking check...');
    await this.cancelExpiredBookings();
    await this.cancelCheckinOverdueBookings();
  }

  private async cancelExpiredBookings() {
    try {
      const now = admin.firestore.Timestamp.now();
      // 24 hours ago
      const twentyFourHoursAgo = admin.firestore.Timestamp.fromMillis(now.toMillis() - 24 * 60 * 60 * 1000);

      // We cannot use inequality on two different fields (status and createdAt) easily in Firestore without composite index.
      // So we fetch all pending bookings and filter in memory, or fetch bookings where status IN ['pending', 'confirmed']
      const bookingsRef = this.firebaseService.getFirestore().collection('bookings');
      const snapshot = await bookingsRef.where('status', 'in', ['pending', 'confirmed']).get();

      let count = 0;
      const batch = this.firebaseService.getFirestore().batch();

      snapshot.forEach(doc => {
        const data = doc.data();
        const createdAt = data.createdAt as admin.firestore.Timestamp;

        if (createdAt && createdAt.toMillis() <= twentyFourHoursAgo.toMillis()) {
          batch.update(doc.ref, { 
            status: 'cancelled',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          count++;
        }
      });

      if (count > 0) {
        await batch.commit();
        this.logger.log(`Cancelled ${count} bookings that exceeded 24 hours without payment`);
      }
    } catch (e) {
      this.logger.error('Error in cancelExpiredBookings', e);
    }
  }

  private async cancelCheckinOverdueBookings() {
    try {
      const now = admin.firestore.Timestamp.now();

      const bookingsRef = this.firebaseService.getFirestore().collection('bookings');
      const snapshot = await bookingsRef.where('status', 'in', ['pending', 'confirmed']).get();

      let count = 0;
      const batch = this.firebaseService.getFirestore().batch();

      snapshot.forEach(doc => {
        const data = doc.data();
        const checkIn = data.checkIn as admin.firestore.Timestamp;

        if (checkIn && checkIn.toMillis() <= now.toMillis()) {
          batch.update(doc.ref, { 
            status: 'cancelled',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          count++;
        }
      });

      if (count > 0) {
        await batch.commit();
        this.logger.log(`Cancelled ${count} bookings where check-in time arrived without payment`);
      }
    } catch (e) {
      this.logger.error('Error in cancelCheckinOverdueBookings', e);
    }
  }
}
