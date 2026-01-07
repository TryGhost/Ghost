import assert from 'assert/strict';
import {BookshelfClickEventRepository, ClickEvent} from '../../../../../../core/server/services/recommendations/service';
import sinon from 'sinon';

describe('BookshelfClickEventRepository', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('toPrimitive', async function () {
        const repository = new BookshelfClickEventRepository({} as any, {
            sentry: undefined
        });
        assert.deepEqual(
            repository.toPrimitive(ClickEvent.create({
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
        const repository = new BookshelfClickEventRepository({} as any, {
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
            ClickEvent.create({
                id: 'id',
                recommendationId: 'recommendationId',
                memberId: 'memberId',
                createdAt: new Date('2021-01-01')
            })
        );
    });

    it('modelToEntity returns null on errors', async function () {
        const captureException = sinon.stub();
        const repository = new BookshelfClickEventRepository({} as any, {
            sentry: {
                captureException
            }
        });

        sinon.stub(ClickEvent, 'create').throws(new Error('test'));
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
        const repository = new BookshelfClickEventRepository({} as any, {
            sentry: {
                captureException
            }
        });

        assert.ok(repository.getFieldToColumnMap());
    });
});
