import { BadRequestException, CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';
import { Message } from '../../../libs/enums/common.enum';
import { getTokenFromRequest, hasValidCsrf, isMutationOperation } from '../auth-cookie.util';

// AUTHORIZATION GUARD => TAMGA + HUQUQ
@Injectable()
export class RolesGuard implements CanActivate {
	constructor(
		private reflector: Reflector,
		private authService: AuthService,
	) {}

	async canActivate(context: ExecutionContext | any): Promise<boolean> {
		const roles = this.reflector.get<string[]>('roles', context.getHandler());
		if (!roles) return true;

		if (context.contextType === 'graphql') {
			const request = context.getArgByIndex(2).req;
			const { token, source } = getTokenFromRequest(request);
			if (!token) throw new BadRequestException(Message.TOKEN_NOT_EXIST);

			const csrfRequired = source === 'cookie' && isMutationOperation(context);
			if (csrfRequired && !hasValidCsrf(request)) {
				throw new BadRequestException('CSRF token is invalid or missing');
			}

			const authMember = await this.authService.verifyToken(token),
				hasRole = () => roles.indexOf(authMember.memberType) > -1,
				hasPermission: boolean = hasRole();

			if (!authMember || !hasPermission) throw new ForbiddenException(Message.ONLY_SPECIFIC_ROLES_ALLOWED);

			request.body.authMember = authMember;
			return true;
		}
		return true;

		// description => http, rpc, gprs and etc are ignored
	}
}
