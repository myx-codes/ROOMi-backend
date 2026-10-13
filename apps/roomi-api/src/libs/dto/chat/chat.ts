import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { Types } from 'mongoose';
import { ChatSenderType, ChatThreadStatus } from '../../enums/chat.enum';

@ObjectType()
export class ChatMessage {
  @Field(() => ID)
  _id: Types.ObjectId;

  @Field(() => ID)
  threadId: Types.ObjectId;

  @Field(() => ChatSenderType)
  senderType: ChatSenderType;

  @Field(() => String)
  content: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

@ObjectType()
export class ChatThread {
  @Field(() => ID)
  _id: Types.ObjectId;

  @Field(() => ID, { nullable: true })
  memberId?: Types.ObjectId | null;

  @Field(() => String, { nullable: true })
  sessionId?: string | null;

  @Field(() => ID, { nullable: true })
  propertyId?: Types.ObjectId | null;

  @Field(() => String)
  title: string;

  @Field(() => ChatThreadStatus)
  status: ChatThreadStatus;

  @Field(() => Date)
  lastMessageAt: Date;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => [ChatMessage], { nullable: true })
  messages?: ChatMessage[];
}

@ObjectType()
export class ChatThreads {
  @Field(() => [ChatThread])
  list: ChatThread[];
}

@ObjectType()
export class ChatThreadReply {
  @Field(() => ChatThread)
  thread: ChatThread;

  @Field(() => ChatMessage)
  userMessage: ChatMessage;

  @Field(() => ChatMessage, { nullable: true })
  assistantMessage?: ChatMessage | null;

  @Field(() => Int)
  messageCount: number;
}
