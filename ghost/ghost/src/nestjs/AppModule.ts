import {SnippetsController} from '../http/controllers/snippets.controller';
import {SnippetsService} from '../core/snippets/snippets.service';
import {KnexSnippetsRepository} from '../db/knex/snippets.repository';
import {SlackNotificationsListener} from '../listeners/slack-notifications.listener';

class AppModuleClass {}

export const AppModule = {
    module: AppModuleClass,
    controllers: [SnippetsController],
    providers: [
        {
            provide: 'SnippetsRepository',
            useClass: KnexSnippetsRepository
        },
        SnippetsService,
        SlackNotificationsListener
    ]
};
