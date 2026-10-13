import { Module } from '@nestjs/common';
import { InjectConnection, MongooseModule } from "@nestjs/mongoose"
import { Connection } from 'mongoose';

const resolveMongoUri = (): string => {
    const uri = process.env.NODE_ENV === 'production'
        ? process.env.MONGO_PROD ?? process.env.MONGO_URL_PROD ?? process.env.MONGO_URL
        : process.env.MONGO_DEV ?? process.env.MONGO_URL ?? process.env.MONGO_PROD ?? process.env.MONGO_URL_PROD;

    if (!uri) {
        throw new Error('MongoDB URI is missing. Set MONGO_DEV, MONGO_PROD, MONGO_URL, or MONGO_URL_PROD.');
    }

    return normalizeMongoUri(uri);
};

const normalizeMongoUri = (uri: string): string => {
    try {
        const parsed = new URL(uri);
        if (parsed.pathname.startsWith('//')) {
            parsed.pathname = `/${parsed.pathname.replace(/^\/+/, '')}`;
        }
        return parsed.toString();
    } catch {
        return uri;
    }
};

@Module({
    imports: [
        MongooseModule.forRootAsync({
            useFactory: () => ({
                uri: resolveMongoUri(),
            })
        })
    ],
    exports: [MongooseModule]
})
export class DatabaseModule {
    constructor(@InjectConnection() private readonly connection: Connection){
        if(connection.readyState ===1) {
            console.log(`MondoDB is connected into ${process.env.NODE_ENV === "production"
                ? "production"
                : "development"
            } db`);
        }else{
            console.log("DB is not connected!")
        }
    }
}
