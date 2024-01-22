import {
    Injectable,
    CanActivate,
    ExecutionContext,
    Inject
} from '@nestjs/common';
import {Reflector} from '@nestjs/core';
import {Roles} from '../../common/decorators/permissions.decorator';
import {Request} from 'express';

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(@Inject(Reflector) private reflector: Reflector) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const roles = this.reflector.get(Roles, context.getHandler());
        const request = context.switchToHttp().getRequest<Request>();

        const role = request.actor?.role;

        if (role && roles.includes(role)) {
            return true;
        }
        return false;
    }
}
