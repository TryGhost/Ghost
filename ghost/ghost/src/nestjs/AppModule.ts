import {SnippetsController} from '../http/controllers/snippets.controller';

class AppModuleClass {}

export const AppModule = {
    module: AppModuleClass,
    controllers: [SnippetsController],
    providers: []
};
