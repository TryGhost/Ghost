import ObjectId from 'bson-objectid';
import {Test} from '@nestjs/testing';
import {Snippet} from '../../../core/snippets/snippet.entity';
import {SnippetsController} from './snippets.controller';
import {SnippetsService} from '../../../core/snippets/snippets.service';
import {SnippetsRepositoryInMemory} from '../../../core/snippets/snippets.repository.inmemory';
import assert from 'assert/strict';
import {SnippetsRepository} from '../../../core/snippets/snippets.repository.interface';

describe('SnippetsController', () => {
    let snippetsController: SnippetsController;
    let snippetsRepository: SnippetsRepository;

    beforeEach(async () => {
        snippetsRepository = new SnippetsRepositoryInMemory();
        const moduleRef = await Test.createTestingModule({
            controllers: [SnippetsController],
            providers: [
                {
                    provide: 'SnippetsRepository',
                    useValue: snippetsRepository
                },
                SnippetsService,
                {
                    provide: 'SessionService',
                    useValue: {
                        getUserForSession() {
                            return null;
                        }
                    }
                },
                {
                    provide: 'AdminAuthenticationService',
                    useValue: {
                        authenticateWithToken() {
                            return null;
                        }
                    }
                }
            ]
        }).compile();

        snippetsController =
            moduleRef.get<SnippetsController>(SnippetsController);
    });

    describe('browse', () => {
        it('should return an array of snippets', async () => {
            const mockSnippet = new Snippet({
                id: ObjectId(),
                deleted: false,
                name: 'Test',
                mobiledoc:
                    '{"version":"0.3.1","atoms":[],"cards":[],"markups":[],"sections":[[1,"p",[[0,[],0,"Test"]]]]}',
                lexical: undefined,
                createdAt: new Date(),
                updatedAt: null,
                createdBy: ObjectId(),
                updatedBy: null
            });
            snippetsRepository.save(mockSnippet);
            const serviceSnippetResult = {
                snippets: [mockSnippet],
                pagination: {
                    page: 1,
                    limit: 15,
                    pages: 1,
                    total: 1
                }
            };

            const response = await snippetsController.browse();
            assert.equal(response.snippets.length, 1);
            assert.equal(Object.keys(response.snippets[0]).length, 6);
            assert.equal(
                response.snippets[0].id,
                serviceSnippetResult.snippets[0].id.toString()
            );
            assert.equal(
                response.snippets[0].name,
                serviceSnippetResult.snippets[0].name
            );
            assert.equal(
                response.snippets[0].mobiledoc,
                serviceSnippetResult.snippets[0].mobiledoc
            );
            assert.equal(response.snippets[0].lexical, undefined);
            assert.equal(
                response.snippets[0].created_at,
                serviceSnippetResult.snippets[0].createdAt
            );
            assert.equal(
                response.snippets[0].updated_at,
                serviceSnippetResult.snippets[0].updatedAt
            );
        });
    });
});
