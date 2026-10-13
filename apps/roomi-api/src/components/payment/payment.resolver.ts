import { Args, Mutation, Resolver } from "@nestjs/graphql";
import { PaymentService } from "./payment.service";
import { UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/guards/auth.guard";
import { Payment } from "../../libs/dto/payment/payment";
import { AuthMember } from "../auth/decorators/authMember.decorator";
import { Types } from "mongoose";
import { PaymentMethod } from "../../libs/enums/payment.enum";
import { Roles } from "../auth/decorators/roles.decorator";
import { MemberType } from "../../libs/enums/member.enum";
import { RolesGuard } from "../auth/guards/roles.guard";

@Resolver()
export class PaymentResolver {
    constructor(private readonly paymentService: PaymentService) {}

    @UseGuards(AuthGuard)
    @Mutation(() => Payment)
    public async checkout(
        @Args('bookingId') bookingId: string,
        @Args('paymentMethod', { type: () => PaymentMethod, nullable: true }) paymentMethod: PaymentMethod,
        @AuthMember('_id') memberId: Types.ObjectId,
    ): Promise<Payment> {
        return await this.paymentService.checkout(memberId, bookingId, paymentMethod);
    }

    @UseGuards(AuthGuard)
    @Mutation(() => Payment)
    public async createPayment(
        @Args('bookingId') bookingId: string,
        @Args('paymentMethod', { type: () => PaymentMethod, nullable: true }) paymentMethod: PaymentMethod,
        @Args('idempotencyKey', { nullable: true }) idempotencyKey: string,
        @AuthMember('_id') memberId: Types.ObjectId,
    ): Promise<Payment> {
        return await this.paymentService.createPayment(memberId, bookingId, paymentMethod, idempotencyKey);
    }

    @Roles(MemberType.ADMIN)
    @UseGuards(RolesGuard)
    @Mutation(() => Payment)
    public async markPaymentSucceededByAdmin(
        @Args('paymentId') paymentId: string,
        @Args('providerTransactionId', { nullable: true }) providerTransactionId: string,
    ): Promise<Payment> {
        return await this.paymentService.markPaymentSucceeded(paymentId, providerTransactionId);
    }
}
