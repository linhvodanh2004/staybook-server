import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly firebaseService: FirebaseService) {}

  async sendPushNotification(
    token: string,
    title: string,
    body: string,
    data?: { [key: string]: string },
  ): Promise<boolean> {
    try {
      const message = {
        notification: {
          title,
          body,
        },
        data: data || {},
        token: token,
      };

      const response = await this.firebaseService.getMessaging().send(message);
      this.logger.log(`Successfully sent message: ${response}`);
      return true;
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`, error.stack);
      return false;
    }
  }
}
