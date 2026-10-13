import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger: Logger = new Logger();

    public intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const recordTime = Date.now();
        const requestType = context.getType<GqlContextType>();

        if (requestType === 'http') {
            /* Develop if needed! */
        } else if (requestType === 'graphql') {
            /* (1) Print Request */
            const gqlContext = GqlExecutionContext.create(context);
            const requestBody = gqlContext.getContext().req.body;
            this.logger.log(this.describeGraphqlOperation(requestBody), 'REQUEST');

            /* (2) Errors handing via GraphQL */
            /* (3) No Errors, giving Response below */
            return next.handle().pipe(
                tap(() => {
                    const responseTime = Date.now() - recordTime;
                    this.logger.log(`completed - ${responseTime}ms`, 'RESPONSE');
                }),
                
            );
        } return next.handle().pipe();
    }

    private describeGraphqlOperation(body: any): string {
        const operationName = body?.operationName ?? 'anonymous';
        const query = typeof body?.query === 'string' ? body.query.replace(/\s+/g, ' ').trim() : '';
        const operationType = query.startsWith('mutation') ? 'mutation' : query.startsWith('query') ? 'query' : 'graphql';
        return `${operationType}:${operationName}`;
    }
}
