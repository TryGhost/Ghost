import assert from 'assert';
import {ActorRepository} from './actor.repository';
import {WebFingerService} from './webfinger.service';
import {Actor} from './actor.entity';

describe('WebFingerService', function () {
    describe('getResource', function () {
        it('Throws with invalid resource', async function () {
            const repository: ActorRepository = {} as ActorRepository;
            const service = new WebFingerService(repository, new URL('https://activitypub.server'));

            await service.getResource('invalid').then(
                () => {
                    throw new Error('Should have thrown');
                },
                (err) => {
                    assert.ok(err);
                }
            );
        });

        it('Throws with missing actor', async function () {
            const repository: ActorRepository = {
                async getOne() {
                    return null;
                }
            } as unknown as ActorRepository;
            const service = new WebFingerService(repository, new URL('https://activitypub.server'));

            await service.getResource('invalid').then(
                () => {
                    throw new Error('Should have thrown');
                },
                (err) => {
                    assert.ok(err);
                }
            );
        });

        it('Responds with webfinger for found actors', async function () {
            const actor = Actor.create({username: 'c00ld00d'});
            const repository: ActorRepository = {
                async getOne() {
                    return actor;
                }
            } as unknown as ActorRepository;
            const url = new URL('https://activitypub.server');
            const service = new WebFingerService(repository, url);

            const subject = 'acct:c00ld00d@activitypub.server';
            const result = await service.getResource(subject);

            assert.deepEqual(result, {
                subject,
                links: [{
                    rel: 'self',
                    type: 'application/activity+json',
                    href: actor.getJSONLD(url).id
                }]
            });
        });
    });

    describe('#finger', function () {
        it('Throws with invalid usernames', async function () {
            const repository: ActorRepository = {} as ActorRepository;
            const service = new WebFingerService(repository, new URL('https://activitypub.server'));

            await service.finger('invalid').then(
                () => {
                    throw new Error('Should have thrown');
                },
                (err) => {
                    assert.ok(err);
                }
            );
        });
    });
});
