import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { MemberModule } from './member/member.module';
import { PropertyModule } from './property/property.module';
import { BookingModule } from './booking/booking.module';
import { AvailabilityModule } from './availability/availability.module';
import { PaymentModule } from './payment/payment.module';
import { CommentModule } from './comment/comment.module';
import { LikeModule } from './like/like.module';
import { ViewModule } from './view/view.module';
import { BoardArticleModule } from './board-article/board-article.module';
import { NoticeResolver } from './notifaction/notice.resolver';
import { NoticeService } from './notifaction/notice.service';
import { NoticeModule } from './notifaction/notice.module';
import { ChatModule } from './assistant/chat.module';
import { AgentDashboardModule } from './agent-dashboard/agent-dashboard.module';
import { BookableUnitModule } from './bookable-unit/bookable-unit.module';

@Module({
  imports: [
    AuthModule, 
    MemberModule, 
    PropertyModule, 
    BookingModule, 
    AvailabilityModule, 
    PaymentModule, 
    CommentModule, 
    LikeModule, 
    ViewModule, 
    BoardArticleModule,
    NoticeModule,
    ChatModule,
    AgentDashboardModule,
    BookableUnitModule,
  ],
  providers: [],
})
export class ComponentsModule {}
