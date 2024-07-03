import request from 'supertest';
import {Test} from '@nestjs/testing';
import {WebFingerService} from '../../../core/activitypub/webfinger.service';
import {ActivityRepositoryInMemory} from '../../../db/in-memory/activity.repository.in-memory';
import {ActivityPubController} from './activitypub.controller';
import {JSONLDService} from '../../../core/activitypub/jsonld.service';
import {InboxService} from '../../../core/activitypub/inbox.service';
import {ActivityPubService} from '../../../core/activitypub/activitypub.service';
import {ActorRepositoryInMemory} from '../../../db/in-memory/actor.repository.in-memory';
import {ActivityService} from '../../../core/activitypub/activity.service';
import {HTTPSignature} from '../../../core/activitypub/http-signature.service';
import {ActivityListener} from '../../../listeners/activity.listener';
import {TheWorld} from '../../../core/activitypub/tell-the-world.service';
import DomainEvents from '@tryghost/domain-events';
import {NestApplication} from '@nestjs/core';
import ObjectID from 'bson-objectid';
import {URI} from '../../../core/activitypub/uri.object';

describe('ActivityPubController', function () {
    let app: NestApplication;
    before(async function () {
        const moduleRef = await Test.createTestingModule({
            controllers: [ActivityPubController],
            providers: [
                {
                    provide: 'logger',
                    useValue: console
                },
                {
                    provide: 'ActivityPubBaseURL',
                    useValue: new URL('https://example.com')
                },
                {
                    provide: 'SettingsCache',
                    useValue: {
                        get(_key: string) {
                            return 'value';
                        }
                    }
                },
                {
                    provide: 'DomainEvents',
                    useValue: DomainEvents
                },
                {
                    provide: 'ActorRepository',
                    useClass: ActorRepositoryInMemory
                },
                {
                    provide: 'ActivityService',
                    useClass: ActivityService
                },
                {
                    provide: 'PostRepository',
                    useValue: {
                        async getOne(id: ObjectID) {
                            return {
                                id,
                                title: 'Testing',
                                slug: 'testing',
                                html: '<p> testing </p>',
                                visibility: 'public',
                                authors: ['Mr Roach'],
                                url: new URI('roachie'),
                                publishedAt: new Date(),
                                featuredImage: null,
                                excerpt: 'testing...'
                            };
                        }
                    }
                },
                {
                    provide: 'ActivityRepository',
                    useClass: ActivityRepositoryInMemory
                },
                WebFingerService,
                JSONLDService,
                HTTPSignature,
                ActivityService,
                InboxService,
                ActivityListener,
                ActivityPubService,
                TheWorld
            ]
        }).compile();

        app = moduleRef.createNestApplication();
        await app.init();
    });
    after(async function () {
        await app.close();
    });

    it('Can handle requests to get the actor', async function () {
        await request(app.getHttpServer())
            .get('/activitypub/actor/deadbeefdeadbeefdeadbeef')
            .expect(200);
    });

    it('Can handle requests to get the outbox', async function () {
        await request(app.getHttpServer())
            .get('/activitypub/outbox/deadbeefdeadbeefdeadbeef')
            .expect(200);
    });

    it('Can handle requests to get the inbox', async function () {
        await request(app.getHttpServer())
            .get('/activitypub/inbox/deadbeefdeadbeefdeadbeef')
            .expect(200);
    });

    it('Can handle requests to get the following', async function () {
        await request(app.getHttpServer())
            .get('/activitypub/following/deadbeefdeadbeefdeadbeef')
            .expect(200);
    });

    it('Can handle requests to get the followers', async function () {
        await request(app.getHttpServer())
            .get('/activitypub/followers/deadbeefdeadbeefdeadbeef')
            .expect(200);
    });

    it('Can handle requests to get an article', async function () {
        await request(app.getHttpServer())
            .get('/activitypub/article/deadbeefdeadbeefdeadbeef')
            .expect(200);
    });

    describe('/inbox/:id', function () {
        it('Errors with invalid requests', async function () {
            await request(app.getHttpServer())
                .post('/activitypub/inbox/deadbeefdeadbeefdeadbeef')
                .send({
                    type: 'Follow',
                    actor: 'https://site.com/actor',
                    object: 'https://site.com/object'
                })
                .expect(500);
        });
    });
});
