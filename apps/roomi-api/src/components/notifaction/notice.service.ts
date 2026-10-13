import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notice } from '../../libs/dto/notification/notification';
import { NoticeInput } from '../../libs/dto/notification/notification.input';
import { NoticeStatus } from '../../libs/enums/notification.enum';

@Injectable()
export class NoticeService {
    constructor(
        @InjectModel('Notice') private readonly noticeModel: Model<Notice>,
    ) {}

    // 1. Bildirishnoma yaratish (BookingService ichida chaqiriladi)
    public async createNotification(input: NoticeInput): Promise<Notice> {
        try {
            return await this.noticeModel.create(input);
        } catch (err) {
            console.error('Error, createNotification:', err.message);
            throw new InternalServerErrorException("Bildirishnoma yaratishda xato!");
        }
    }

    // 2. Foydalanuvchining o'ziga tegishli bildirishnomalarni olish
    public async getNotifications(memberId: Types.ObjectId): Promise<Notice[]> {
        return await this.noticeModel
            .find({ receiverId: memberId, status: { $ne: NoticeStatus.DELETE } })
            .sort({ createdAt: -1 }) // Eng yangilari tepada
            .exec();
    }

    // 3. Bildirishnomani o'qildi deb belgilash
    public async markAsRead(memberId: Types.ObjectId, notificationId: Types.ObjectId): Promise<Notice> {
        const result = await this.noticeModel
            .findOneAndUpdate(
                { _id: notificationId, receiverId: memberId, status: { $ne: NoticeStatus.DELETE } },
                { status: NoticeStatus.READ },
                { returnDocument: 'after' },
            )
            .exec();
        
        if (!result) throw new InternalServerErrorException("Bildirishnoma topilmadi!");
        return result;
    }
}
