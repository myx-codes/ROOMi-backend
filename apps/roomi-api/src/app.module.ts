import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from "@nestjs/config"
import { GraphQLModule } from "@nestjs/graphql"
import { ApolloDriver } from "@nestjs/apollo"
import { AppResolver } from './app.resolver';
import { ComponentsModule } from './components/components.module';
import { DatabaseModule } from './database/database.module';
import { T } from './libs/types/common';
import { SocketModule } from './socket/socket.module';

const readBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (!value) return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
};

const enableIntrospection = readBoolean(
  process.env.GRAPHQL_INTROSPECTION,
  process.env.NODE_ENV !== 'production',
);

@Module({
  imports: [
    ConfigModule.forRoot(), 
    GraphQLModule.forRoot({
    driver: ApolloDriver,
    playground: enableIntrospection,
    introspection: enableIntrospection,
    uploads: false,
    autoSchemaFile: true,
    bodyParserConfig: {
      limit: '10mb',
    },
    context: ({ req, res }) => ({ req, res }),
    formatError: (error: T) => {
      const nestedMessage =
        error?.extensions?.exception?.response?.message ??
        error?.extensions?.response?.message ??
        error?.extensions?.originalError?.message;

      const message = Array.isArray(nestedMessage)
        ? nestedMessage.join('; ')
        : nestedMessage || error?.message;

      const graphQLFormattedError = {
        code: error?.extensions.code,
        message,
      };
      return graphQLFormattedError;
    },
  }),
  ComponentsModule,
  DatabaseModule, SocketModule],
  controllers: [AppController],
  providers: [AppService, AppResolver],
})
export class AppModule {}
