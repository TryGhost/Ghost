import request from 'supertest';
import {Test} from '@nestjs/testing';
import {WebFingerService} from '../../../core/activitypub/webfinger.service';
import {WebFingerController} from './webfinger.controller';
import {ActivityRepositoryInMemory} from '../../../db/in-memory/activity.repository.in-memory';

describe('WebFingerController', function () {
    it('Responds to HTTP requests for .well-known/webfinger correctly', async function () {
        const moduleRef = await Test.createTestingModule({
            controllers: [WebFingerController],
            providers: [
                WebFingerService,
                {
                    provide: 'ActivityPubBaseURL',
                    useValue: new URL('https://example.com')
                },
                {
                    provide: 'ActorRepository',
                    useClass: ActivityRepositoryInMemory
                }
            ]
        })
            .overrideProvider(WebFingerService)
            .useValue({
                async getResource() {}
            })
            .compile();

        const app = moduleRef.createNestApplication();
        await app.init();

        request(app.getHttpServer())
            .get('/.well-known/webfinger?resource=acct:egg@ghost.org')
            .expect(200);

        await app.close();
    });
});
