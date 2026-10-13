import { BadRequestException, CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { Message } from '../../../libs/enums/common.enum';
import { getTokenFromRequest, hasValidCsrf, isMutationOperation } from '../auth-cookie.util';

 // AUTHENTICATION GUARD => TAMGA
 // Dependency Injection
@Injectable()
export class AuthGuard implements CanActivate {
	constructor(private authService: AuthService) {}

	async canActivate(context: ExecutionContext | any): Promise<boolean> {
		if (context.contextType === 'graphql') {
			const request = context.getArgByIndex(2).req;
			const { token, source } = getTokenFromRequest(request);
			if (!token) throw new BadRequestException(Message.TOKEN_NOT_EXIST);

			const csrfRequired = source === 'cookie' && isMutationOperation(context);
			if (csrfRequired && !hasValidCsrf(request)) {
				throw new BadRequestException('CSRF token is invalid or missing');
			}

			const authMember = await this.authService.verifyToken(token);
			if (!authMember) throw new UnauthorizedException(Message.NOT_AUTHENTICATED);

			request.body.authMember = authMember;

			return true;
		}
		return true;
		// description => http, rpc, gprs and etc are ignored
	}
}
