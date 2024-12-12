import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler
} from '@nestjs/common';
import {Observable} from 'rxjs';
import {tap} from 'rxjs/operators';
import {Request, Response} from 'express';

@Injectable()
export class LocationHeaderInterceptor implements NestInterceptor {
    intercept<T>(context: ExecutionContext, next: CallHandler): Observable<T> {
        if (context.getType() !== 'http') {
            return next.handle();
        }
        const [
            req,
            res
        ]: [Request, Response] = context.getArgs();

        if (req.method !== 'POST') {
            return next.handle();
        }

        function getLocationHeader(responseData: unknown) {
            if (typeof responseData !== 'object' || responseData === null) {
                return;
            }
            const keys = Object.keys(responseData);
            if (keys.length !== 1) {
                return;
            }

            const data: unknown = Reflect.get(responseData, keys[0]);

            if (!Array.isArray(data)) {
                return;
            }

            if (data.length !== 1) {
                return;
            }

            const id = data[0].id;

            if (!id || typeof id !== 'string') {
                return;
            }

            const url = new URL('https://ghost.io');
            url.protocol = req.secure ? 'https:' : 'http:';
            // We use `any` here because we haven't yet extended the express Request object with the vhost plugin types
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            url.host = (req as any).vhost ? (req as any).vhost.host : req.get('host');
            url.pathname = req.path;
            url.pathname += `${id}/`;

            return url;
        }

        return next.handle().pipe(
            tap((data) => {
                const location = getLocationHeader(data);
                if (location) {
                    res.set('location', location.href);
                }
            })
        );
    }
}
