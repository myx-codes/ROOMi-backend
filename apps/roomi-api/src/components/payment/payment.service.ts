import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Payment as PaymentSchemaDoc } from "../../schemas/Payment.model";
import { Booking as BookingSchemaDoc } from "../../schemas/Booking.model";
import { BookingStatus } from "../../libs/enums/booking.enum";
import { PaymentMethod, PaymentStatus } from "../../libs/enums/payment.enum";
import { Payment } from "../../libs/dto/payment/payment";
import { BookingService } from "../booking/booking.service";

@Injectable()
export class PaymentService {
    constructor(
        @InjectModel('Payment') private readonly paymentModel: Model<PaymentSchemaDoc>,
        @InjectModel('Booking') private readonly bookingModel: Model<BookingSchemaDoc>,
        private readonly bookingService: BookingService,
    ) {}

    public async checkout(
        memberId: Types.ObjectId,
        bookingId: string,
        paymentMethod: PaymentMethod = PaymentMethod.PAYME,
    ): Promise<Payment> {
        return this.createPayment(memberId, bookingId, paymentMethod);
    }

    public async createPayment(
        memberId: Types.ObjectId,
        bookingId: string,
        paymentMethod: PaymentMethod = PaymentMethod.PAYME,
        idempotencyKey?: string,
    ): Promise<Payment> {
        if (!Types.ObjectId.isValid(bookingId)) throw new BadRequestException('Noto‘g‘ri bookingId!');

        const bookingObjectId = new Types.ObjectId(bookingId);
        const booking = await this.bookingModel
            .findOne({ _id: bookingObjectId, memberId })
            .lean()
            .exec();

        if (!booking) throw new BadRequestException("Bron topilmadi!");
        if (booking.bookingStatus === BookingStatus.CANCELLED || booking.bookingStatus === BookingStatus.EXPIRED) {
            throw new BadRequestException("Yopilgan bron uchun to‘lov qilib bo‘lmaydi!");
        }
        if (booking.bookingStatus === BookingStatus.CONFIRMED) {
            throw new BadRequestException("Bu bron allaqachon tasdiqlangan!");
        }
        if (booking.bookingStatus !== BookingStatus.AWAITING_PAYMENT && booking.bookingStatus !== BookingStatus.WAITING) {
            throw new BadRequestException("Bu bron hozir to‘lov qabul qilmaydi!");
        }
        if (booking.expiresAt && new Date(booking.expiresAt).getTime() <= Date.now()) {
            throw new BadRequestException("To‘lov oynasi tugagan!");
        }

        const resolvedIdempotencyKey = idempotencyKey ?? `${paymentMethod}:${bookingId}`;
        const existing = await this.paymentModel
            .findOne({
                $or: [
                    { idempotencyKey: resolvedIdempotencyKey },
                    {
                        bookingId: bookingObjectId,
                        paymentMethod,
                        paymentStatus: { $in: [PaymentStatus.CREATED, PaymentStatus.PENDING, PaymentStatus.SUCCEEDED, PaymentStatus.SUCCESS] },
                    },
                ],
            })
            .exec();

        if (existing) return existing as unknown as Payment;

        const payment = await this.paymentModel.create({
            bookingId: booking._id,
            memberId,
            paymentMethod,
            paymentAmount: booking.totalPrice ?? 0,
            paymentStatus: PaymentStatus.PENDING,
            idempotencyKey: resolvedIdempotencyKey,
            legacy: false,
        });

        return payment as unknown as Payment;
    }

    public async markPaymentSucceeded(
        paymentId: string,
        providerTransactionId?: string,
        providerPayload?: Record<string, unknown>,
    ): Promise<Payment> {
        const paymentObjectId = new Types.ObjectId(paymentId);
        const payment = await this.paymentModel.findById(paymentObjectId).exec();
        if (!payment) throw new NotFoundException('Payment not found');

        if (payment.paymentStatus === PaymentStatus.SUCCEEDED || payment.paymentStatus === PaymentStatus.SUCCESS) {
            return payment as unknown as Payment;
        }
        if (payment.paymentStatus === PaymentStatus.CANCELLED || payment.paymentStatus === PaymentStatus.REFUNDED) {
            throw new BadRequestException('Payment is already closed');
        }

        const updated = await this.paymentModel
            .findByIdAndUpdate(
                payment._id,
                {
                    paymentStatus: PaymentStatus.SUCCEEDED,
                    providerTransactionId: providerTransactionId ?? payment.providerTransactionId ?? null,
                    providerPayload: providerPayload ?? payment.providerPayload ?? null,
                    paidAt: payment.paidAt ?? new Date(),
                },
                { returnDocument: 'after' },
            )
            .exec();
        if (!updated) throw new NotFoundException('Payment not found');

        await this.bookingService.confirmPaidBooking(updated.bookingId);
        return updated as unknown as Payment;
    }

    public async markPaymentFailed(paymentId: string, providerPayload?: Record<string, unknown>): Promise<Payment> {
        const payment = await this.paymentModel
            .findByIdAndUpdate(
                new Types.ObjectId(paymentId),
                {
                    paymentStatus: PaymentStatus.FAILED,
                    providerPayload: providerPayload ?? null,
                },
                { returnDocument: 'after' },
            )
            .exec();
        if (!payment) throw new NotFoundException('Payment not found');
        return payment as unknown as Payment;
    }

    public async handlePaymeJsonRpc(body: any): Promise<Record<string, unknown>> {
        const id = body?.id ?? null;
        const method = body?.method;
        const params = body?.params ?? {};

        try {
            if (method === 'CheckPerformTransaction') {
                const booking = await this.findPaymeBooking(params?.account);
                this.assertPaymeAmount(booking, params?.amount);
                this.assertBookingPayable(booking);
                return this.paymeResult(id, { allow: true });
            }

            if (method === 'CreateTransaction') {
                const booking = await this.findPaymeBooking(params?.account);
                this.assertPaymeAmount(booking, params?.amount);
                this.assertBookingPayable(booking);

                const providerTransactionId = String(params?.id ?? '');
                if (!providerTransactionId) throw new BadRequestException('Payme transaction id is required');

                const existing = await this.paymentModel
                    .findOne({ providerTransactionId })
                    .exec();
                if (existing) {
                    const existingDoc = existing as any;
                    return this.paymeResult(id, {
                        create_time: existingDoc.createdAt ? new Date(existingDoc.createdAt).getTime() : Date.now(),
                        transaction: String(existingDoc._id),
                        state: this.paymeState(existing.paymentStatus),
                    });
                }

                const payment = await this.paymentModel.create({
                    bookingId: booking._id,
                    memberId: booking.memberId,
                    paymentMethod: PaymentMethod.PAYME,
                    paymentAmount: booking.totalPrice ?? 0,
                    paymentStatus: PaymentStatus.PENDING,
                    transactionId: `payme:${providerTransactionId}`,
                    providerTransactionId,
                    idempotencyKey: `payme:${providerTransactionId}`,
                    providerPayload: params,
                    legacy: false,
                });

                return this.paymeResult(id, {
                    create_time: new Date((payment as any).createdAt ?? Date.now()).getTime(),
                    transaction: String((payment as any)._id),
                    state: 1,
                });
            }

            if (method === 'PerformTransaction') {
                const payment = await this.findPaymePayment(params?.id);
                const updated = await this.markPaymentSucceeded(String(payment._id), String(params?.id), params);
                return this.paymeResult(id, {
                    transaction: String(updated._id),
                    perform_time: updated.paidAt ? new Date(updated.paidAt).getTime() : Date.now(),
                    state: 2,
                });
            }

            if (method === 'CancelTransaction') {
                const payment = await this.findPaymePayment(params?.id);
                if (payment.paymentStatus !== PaymentStatus.SUCCEEDED && payment.paymentStatus !== PaymentStatus.SUCCESS) {
                    payment.paymentStatus = PaymentStatus.CANCELLED;
                    payment.providerPayload = params;
                    await payment.save();
                }
                return this.paymeResult(id, {
                    transaction: String(payment._id),
                    cancel_time: Date.now(),
                    state: payment.paymentStatus === PaymentStatus.SUCCEEDED || payment.paymentStatus === PaymentStatus.SUCCESS ? -2 : -1,
                });
            }

            if (method === 'CheckTransaction') {
                const payment = await this.findPaymePayment(params?.id);
                const paymentDoc = payment as any;
                return this.paymeResult(id, {
                    create_time: paymentDoc.createdAt ? new Date(paymentDoc.createdAt).getTime() : 0,
                    perform_time: payment.paidAt ? new Date(payment.paidAt).getTime() : 0,
                    cancel_time: 0,
                    transaction: String(paymentDoc._id),
                    state: this.paymeState(payment.paymentStatus),
                    reason: null,
                });
            }

            if (method === 'GetStatement') {
                const from = Number(params?.from ?? 0);
                const to = Number(params?.to ?? Date.now());
                const transactions = await this.paymentModel
                    .find({
                        paymentMethod: PaymentMethod.PAYME,
                        createdAt: {
                            $gte: new Date(from),
                            $lte: new Date(to),
                        },
                    })
                    .lean()
                    .exec();

                return this.paymeResult(id, {
                    transactions: transactions.map((payment: any) => ({
                        id: payment.providerTransactionId,
                        time: new Date(payment.createdAt).getTime(),
                        amount: payment.paymentAmount,
                        account: { booking_id: String(payment.bookingId) },
                        create_time: new Date(payment.createdAt).getTime(),
                        perform_time: payment.paidAt ? new Date(payment.paidAt).getTime() : 0,
                        cancel_time: 0,
                        transaction: String(payment._id),
                        state: this.paymeState(payment.paymentStatus),
                        reason: null,
                    })),
                });
            }

            return this.paymeError(id, -32601, 'Method not found');
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return this.paymeError(id, -31001, message);
        }
    }

    private async findPaymeBooking(account: Record<string, unknown>): Promise<any> {
        const bookingId = account?.booking_id ?? account?.bookingId ?? account?.order_id;
        if (!bookingId || !Types.ObjectId.isValid(String(bookingId))) {
            throw new BadRequestException('Booking account is invalid');
        }

        const booking = await this.bookingModel.findById(new Types.ObjectId(String(bookingId))).exec();
        if (!booking) throw new NotFoundException('Booking not found');
        return booking;
    }

    private async findPaymePayment(providerTransactionId: string): Promise<any> {
        if (!providerTransactionId) throw new BadRequestException('Payme transaction id is required');
        const payment = await this.paymentModel.findOne({ providerTransactionId: String(providerTransactionId) }).exec();
        if (!payment) throw new NotFoundException('Payment not found');
        return payment;
    }

    private assertPaymeAmount(booking: any, amount: unknown): void {
        const requestedAmount = Number(amount);
        const bookingAmount = Number(booking.totalPrice ?? 0);
        if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
            throw new BadRequestException('Amount is invalid');
        }
        if (requestedAmount !== bookingAmount && requestedAmount !== bookingAmount * 100) {
            throw new BadRequestException('Amount does not match booking total');
        }
    }

    private assertBookingPayable(booking: any): void {
        if (booking.bookingStatus !== BookingStatus.AWAITING_PAYMENT && booking.bookingStatus !== BookingStatus.WAITING) {
            throw new BadRequestException('Booking is not payable');
        }
        if (booking.expiresAt && new Date(booking.expiresAt).getTime() <= Date.now()) {
            throw new BadRequestException('Booking payment window expired');
        }
    }

    private paymeState(paymentStatus: PaymentStatus): number {
        if (paymentStatus === PaymentStatus.SUCCEEDED || paymentStatus === PaymentStatus.SUCCESS) return 2;
        if (paymentStatus === PaymentStatus.CANCELLED || paymentStatus === PaymentStatus.FAILED) return -1;
        if (paymentStatus === PaymentStatus.REFUNDED || paymentStatus === PaymentStatus.PARTIALLY_REFUNDED) return -2;
        return 1;
    }

    private paymeResult(id: unknown, result: Record<string, unknown>): Record<string, unknown> {
        return { jsonrpc: '2.0', id, result };
    }

    private paymeError(id: unknown, code: number, message: string): Record<string, unknown> {
        return {
            jsonrpc: '2.0',
            id,
            error: {
                code,
                message,
            },
        };
    }
}
