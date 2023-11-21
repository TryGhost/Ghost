import {CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor} from '@nestjs/common';
import {ISettingsCache} from '../../common/settings-cache.interface';
import {map} from 'rxjs/operators';

@Injectable()
export class TimezoneInterceptor implements NestInterceptor {
    constructor(
        @Inject('settings') private readonly settings: ISettingsCache
    ) {}

    format(date: string) {
        // TODO Use moment-timezone or smth to format the date
        return date;
    }

    intercept(context: ExecutionContext, next: CallHandler) {
        return next.handle().pipe(map((data: unknown) => {
            if (data === null) {
                return data;
            }
            if (typeof data !== 'object') {
                return data;
            }
            const keys = Object.keys(data);

            let field: string;
            if (keys.length === 1) {
                field = keys[0];
            } else if (keys.length === 2) {
                const filtered = keys.filter(key => key !== 'meta');
                if (filtered.length !== 1) {
                    return data;
                }
                field = filtered[0];
            } else {
                return data;
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const objects = (data as any)[field];

            return {
                ...data,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                [field]: objects.map((object: any) => {
                    ['created_at', 'updated_at', 'published_at'].forEach(
                        (key) => {
                            if (object[key]) {
                                object[key] = this.format(object[key]);
                            }
                        }
                    );
                    return object;
                })
            };
        }));
    }
}
