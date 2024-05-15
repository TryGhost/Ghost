import assert from 'assert';
import {ExampleController} from './example.controller';
import * as sinon from 'sinon';
import {ExampleService} from '../../../core/example/example.service';

describe('ExampleController', function () {
    describe('#read', function () {
        it('returns the result of the greet method', async function () {
            const service = Object.create(ExampleService.prototype);
            service.greet = sinon.stub();

            const controller = new ExampleController(service);

            const result = await controller.read('egg');

            assert.equal(result, service.greet.returnValues[0]);
        });
    });
});
