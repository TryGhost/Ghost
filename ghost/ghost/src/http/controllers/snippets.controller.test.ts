import ObjectId from 'bson-objectid';
import {Test} from '@nestjs/testing';
import {Snippet} from '../../core/snippets/snippet.entity';
import {SnippetsController} from './snippets.controller';
import {SnippetsService} from '../../core/snippets/snippets.service';
import {SnippetsRepositoryInMemory} from '../../core/snippets/snippets.repository.inmemory';
import assert from 'assert/strict';
import sinon from 'sinon';

describe('SnippetsController', () => {
    let snippetsController: SnippetsController;
    let snippetsService: SnippetsService;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            controllers: [SnippetsController],
            providers: [
                {
                    provide: 'SnippetsRepository',
                    useClass: SnippetsRepositoryInMemory
                },
                SnippetsService
            ]
        }).compile();

        snippetsService = moduleRef.get<SnippetsService>(SnippetsService);
        snippetsController = moduleRef.get<SnippetsController>(SnippetsController);
    });

    describe('browse', () => {
        it('should return an array of snippets', async () => {
            const serviceSnippetResult = [new Snippet({
                id: ObjectId(),
                name: 'Test',
                mobiledoc: '{"version":"0.3.1","atoms":[],"cards":[],"markups":[],"sections":[[1,"p",[[0,[],0,"Test"]]]]}',
                lexical: undefined,
                createdAt: new Date(),
                updatedAt: null,
                createdBy: ObjectId(),
                updatedBy: null
            })];

            snippetsService.browse = sinon.stub().returns(serviceSnippetResult);

            const response = await snippetsController.browse();
            assert.equal(response.snippets.length, 1);
            assert.equal(Object.keys(response.snippets[0]).length, 6);
            assert.equal(response.snippets[0].id, serviceSnippetResult[0].id.toString());
            assert.equal(response.snippets[0].name, serviceSnippetResult[0].name);
            assert.equal(response.snippets[0].mobiledoc, serviceSnippetResult[0].mobiledoc);
            assert.equal(response.snippets[0].lexical, undefined);
            assert.equal(response.snippets[0].created_at, serviceSnippetResult[0].createdAt);
            assert.equal(response.snippets[0].updated_at, serviceSnippetResult[0].updatedAt);
        });
    });
});
