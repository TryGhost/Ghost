import {DynamicModule} from '@nestjs/common';
import {APP_FILTER, APP_GUARD, APP_INTERCEPTOR} from '@nestjs/core';
import {AdminAPIModule} from './admin-api.module';
import {NotFoundFallthroughExceptionFilter} from '../filters/not-found-fallthrough.filter';
import {ExampleListener} from '../../listeners/example.listener';
import {AdminAPIAuthentication} from '../guards/admin-api-authentication.guard';
import {PermissionsGuard} from '../guards/permissions.guard';
import {LocationHeaderInterceptor} from '../interceptors/location-header.interceptor';
import {GlobalExceptionFilter} from '../filters/global-exception.filter';

class AppModuleClass {}

export const AppModule: DynamicModule = {
    global: true,
    module: AppModuleClass,
    imports: [AdminAPIModule],
    exports: [],
    controllers: [],
    providers: [
        ExampleListener,
        {
            provide: APP_FILTER,
            useClass: GlobalExceptionFilter
        }, {
            provide: APP_FILTER,
            useClass: NotFoundFallthroughExceptionFilter
        }, {
            provide: APP_GUARD,
            useClass: AdminAPIAuthentication
        }, {
            provide: APP_GUARD,
            useClass: PermissionsGuard
        }, {
            provide: APP_INTERCEPTOR,
            useClass: LocationHeaderInterceptor
        }
    ]
};
