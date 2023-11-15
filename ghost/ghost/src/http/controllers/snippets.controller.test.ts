import {Test} from '@nestjs/testing';
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
            const result = [{
                id: '1'
            }];

            snippetsService.browse = sinon.stub().returns(result);

            const response = await snippetsController.browse();
            assert.equal(response.length, 1);
            assert.equal(response[0], result[0]);
        });
    });
});
