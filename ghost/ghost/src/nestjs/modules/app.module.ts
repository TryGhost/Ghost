import {DynamicModule} from '@nestjs/common';
import {APP_FILTER, RouterModule} from '@nestjs/core';
import {AdminAPIModule} from './admin-api.module';
import {NotFoundFallthroughExceptionFilter} from '../filters/not-found-fallthrough.filter';
import {ExampleListener} from '../../listeners/example.listener';
import {GlobalExceptionFilter} from '../filters/global-exception.filter';

class AppModuleClass {}

export const AppModule: DynamicModule = {
    global: true,
    module: AppModuleClass,
    imports: [
        RouterModule.register([
            {
                path: 'ghost/api/admin',
                module: AdminAPIModule
            }
        ]),
        AdminAPIModule
    ],
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
        }
    ]
};
