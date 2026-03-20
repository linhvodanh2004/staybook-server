import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);

  onModuleInit() {
    if (!admin.apps.length) {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (projectId && clientEmail && privateKey) {
        this.logger.log('Initializing Firebase with explicit environment variables (Render/Prod)');
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
      } else {
        this.logger.log('Initializing Firebase with Google Application Default Credentials (Local)');
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
        });
      }
    }
  }

  getMessaging() {
    return admin.messaging();
  }

  getFirestore() {
    return admin.firestore();
  }
}
