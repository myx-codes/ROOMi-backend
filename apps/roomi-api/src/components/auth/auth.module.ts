import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';

const resolveJwtSecret = (): string => {
  const secret = process.env.SECRET_TOKEN ?? process.env.JWT_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SECRET_TOKEN or JWT_SECRET must be at least 32 characters in production');
  }
  return 'roomi-dev-secret-change-me-32-bytes-min';
};

@Module({
  imports: [
    HttpModule,
    JwtModule.register({
        secret: resolveJwtSecret(),
        signOptions: { expiresIn: "30d" }
    })
  ],
  providers: [AuthService],
  exports: [AuthService]
})
export class AuthModule {}
