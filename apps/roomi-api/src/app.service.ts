import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';

@Injectable()
export class AppService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  healthCheck(): {
    status: 'ok' | 'degraded';
    database: 'connected' | 'disconnected';
    uptime: number;
    timestamp: string;
  } {
    const database = this.connection.readyState === 1 ? 'connected' : 'disconnected';

    return {
      status: database === 'connected' ? 'ok' : 'degraded',
      database,
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
