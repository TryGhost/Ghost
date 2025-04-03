import assert from 'assert/strict';
import {BookshelfSubscribeEventRepository, SubscribeEvent} from '../../../../../../core/server/services/recommendations/service';
import sinon from 'sinon';

describe('BookshelfSubscribeEventRepository', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('toPrimitive', async function () {
        const repository = new BookshelfSubscribeEventRepository({} as any, {
            sentry: undefined
        });
        assert.deepEqual(
            repository.toPrimitive(SubscribeEvent.create({
                id: 'id',
                recommendationId: 'recommendationId',
                memberId: 'memberId',
                createdAt: new Date('2021-01-01')
            })),
            {
                id: 'id',
                recommendation_id: 'recommendationId',
                member_id: 'memberId',
                created_at: new Date('2021-01-01')
            }
        );
    });

    it('modelToEntity', async function () {
        const repository = new BookshelfSubscribeEventRepository({} as any, {
            sentry: undefined
        });
        const entity = repository.modelToEntity({
            id: 'id',
            get: (key: string) => {
                return {
                    recommendation_id: 'recommendationId',
                    member_id: 'memberId',
                    created_at: new Date('2021-01-01')
                }[key];
            }
        } as any);

        assert.deepEqual(
            entity,
            SubscribeEvent.create({
                id: 'id',
                recommendationId: 'recommendationId',
                memberId: 'memberId',
                createdAt: new Date('2021-01-01')
            })
        );
    });

    it('modelToEntity returns null on errors', async function () {
        const captureException = sinon.stub();
        const repository = new BookshelfSubscribeEventRepository({} as any, {
            sentry: {
                captureException
            }
        });

        sinon.stub(SubscribeEvent, 'create').throws(new Error('test'));
        const entity = repository.modelToEntity({
            id: 'id',
            get: (key: string) => {
                return {
                    recommendation_id: 'recommendationId',
                    member_id: 'memberId',
                    created_at: new Date('2021-01-01')
                }[key];
            }
        } as any);

        assert.deepEqual(
            entity,
            null
        );
        sinon.assert.calledOnce(captureException);
    });

    it('getFieldToColumnMap returns', async function () {
        const captureException = sinon.stub();
        const repository = new BookshelfSubscribeEventRepository({} as any, {
            sentry: {
                captureException
            }
        });

        assert.ok(repository.getFieldToColumnMap());
    });
});
