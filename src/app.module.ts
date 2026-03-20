import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FirebaseModule } from './firebase/firebase.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ScheduleModule } from '@nestjs/schedule';
import { PaymentModule } from './payment/payment.module';
import { CronModule } from './cron/cron.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    FirebaseModule,
    NotificationsModule,
    PaymentModule,
    CronModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
