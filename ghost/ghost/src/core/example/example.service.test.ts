import Sinon from 'sinon';
import {ExampleService} from './example.service';
import {Greeting} from './example.entity';
import assert from 'assert';

describe('ExampleService', function () {
    it('Can greet a recipient and save the greeting', async function () {
        const recipient = 'Mr Anderson';
        const entity = new Greeting({greeting: 'Testing'});
        const repository = {
            getOne: Sinon.stub().resolves(entity),
            save: Sinon.stub()
        };
        const service = new ExampleService(repository);

        const result = await service.greet(recipient);

        assert.equal(result, entity.greet(recipient));

        assert(repository.save.calledWithExactly(entity));
    });
});
