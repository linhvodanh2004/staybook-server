import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

export class SendNotificationDto {
  token: string;
  title: string;
  body: string;
  data?: { [key: string]: string };
}

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('send')
  async sendNotification(@Body() dto: SendNotificationDto) {
    if (!dto.token || !dto.title) {
      throw new HttpException('Token and title are required', HttpStatus.BAD_REQUEST);
    }

    const success = await this.notificationsService.sendPushNotification(
      dto.token,
      dto.title,
      dto.body,
      dto.data,
    );

    if (!success) {
      throw new HttpException('Failed to send notification', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return { message: 'Notification sent successfully' };
  }
}
