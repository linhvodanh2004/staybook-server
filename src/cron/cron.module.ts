import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [FirebaseModule],
  providers: [CronService],
})
export class CronModule {}
