import {DynamicModule} from '@nestjs/common';
import {SlackNotificationsListener} from '../listeners/slack-notifications.listener';
import {AdminAPIModule} from './admin-api.module';
import {APP_FILTER} from '@nestjs/core';
import {NotFoundFallthroughExceptionFilter} from '../http/filters/not-found-fallthrough.filter';

class AppModuleClass {}

export const AppModule: DynamicModule = {
    global: true,
    module: AppModuleClass,
    imports: [AdminAPIModule],
    exports: [],
    controllers: [],
    providers: [
        SlackNotificationsListener,
        {
            provide: APP_FILTER,
            useClass: NotFoundFallthroughExceptionFilter
        }
    ]
};
