import { UseGuards } from '@nestjs/common';
import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';

import { Types } from 'mongoose';
import { NoticeService } from './notice.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { Notice } from '../../libs/dto/notification/notification';

@Resolver()
export class NoticeResolver {
    constructor(private readonly noticeService: NoticeService) {}

    // Foydalanuvchi o'z bildirishnomalarini ko'rishi uchun
    @UseGuards(AuthGuard)
    @Query(() => [Notice])
    public async getMyNotifications(
        @AuthMember('_id') memberId: Types.ObjectId,
    ): Promise<Notice[]> {
        return await this.noticeService.getNotifications(memberId);
    }

    // Xabarni o'qildi deb belgilash uchun
    @UseGuards(AuthGuard)
    @Mutation(() => Notice)
    public async updateNotificationStatus(
        @Args('notificationId') notificationId: string,
        @AuthMember('_id') memberId: Types.ObjectId,
    ): Promise<Notice> {
        return await this.noticeService.markAsRead(memberId, new Types.ObjectId(notificationId));
    }
}
