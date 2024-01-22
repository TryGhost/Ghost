import {
    Injectable,
    CanActivate,
    ExecutionContext,
    Inject
} from '@nestjs/common';
import {Request, Response} from 'express';
import {Actor} from '../../common/types/actor.type';
import ObjectID from 'bson-objectid';

// Here we extend the express Request interface with our new type
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        // eslint-disable-next-line no-shadow
        export interface Request {
            actor?: Actor
        }
    }
}

interface SessionService {
    // We use any because we've not got types for bookshelf models
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getUserForSession(req: Request, res: Response): Promise<any>
}

interface AuthenticationService {
    // We use any because we've not got types for bookshelf models
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    authenticateWithToken(url: string, token: string, ignoreMaxAge: boolean): Promise<any>
}

@Injectable()
export class AdminAPIAuthentication implements CanActivate {
    constructor(
        @Inject('SessionService') private sessionService: SessionService,
        @Inject('AdminAuthenticationService') private authService: AuthenticationService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const response = context.switchToHttp().getResponse<Response>();

        const user = await this.sessionService.getUserForSession(request, response);

        if (user) {
            await this.setUserActor(user, request);
            return true;
        }

        if (!request.headers || !request.headers.authorization) {
            return false;
        }

        const [scheme, token] = request.headers.authorization.split(' ');

        if (!/^Ghost$/i.test(scheme)) {
            return false;
        }

        const {apiKey, user: apiUser} = await this.authService.authenticateWithToken(
            request.originalUrl,
            token,
            false
        );

        if (user) {
            await this.setUserActor(apiUser, request);
            return true;
        }

        if (apiKey) {
            await apiKey.related('role').fetch();
            const json = apiKey.toJSON();
            request.actor = {
                id: ObjectID.createFromHexString(json.integration.id),
                role: json.role.name,
                type: 'api_key'
            };

            return true;
        }

        return false;
    }

    // This is `any` because again it represents a bookshelf model
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async setUserActor(user: any, request: Request) {
        await user.related('roles').fetch();
        const json = user.toJSON();
        request.actor = {
            // BS To work around Owner id === 1
            id: ObjectID.createFromHexString(
                json.id === '1' ? 'DEAD01D0DEAD01D0DEAD01D0' : json.id
            ),
            role: json.roles[0].name,
            type: 'user'
        };
    }
}
