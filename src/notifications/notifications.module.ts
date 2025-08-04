import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { EmailService } from './services/email.service';
import { NotificationService } from './services/notification.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
    ]),
  ],
  providers: [EmailService, NotificationService],
  exports: [EmailService, NotificationService],
})
export class NotificationsModule {}
