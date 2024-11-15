import { Injectable } from "@nestjs/common";
import { DataBaseService } from "src/shared/database/database.service";
import { NotificationDocument } from "../models/notification.schema";

@Injectable()
export class NotificationService extends DataBaseService <NotificationDocument>{

    async createNotification(): Promise<Notification> {
        return 
    }
}