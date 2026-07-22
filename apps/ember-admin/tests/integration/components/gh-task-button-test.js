import hbs from 'htmlbars-inline-precompile';
import {click, find, render, settled, waitFor} from '@ember/test-helpers';
import {defineProperty} from '@ember/object';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupRenderingTest} from 'ember-mocha';
import {task, timeout} from 'ember-concurrency';

describe('Integration: Component: gh-task-button', function () {
    setupRenderingTest();

    beforeEach(function () {
        const config = this.owner.lookup('config:main');
        config.accent_color = '#123456';
    });

    it('renders', async function () {
        // sets button text using positional param
        await render(hbs`<GhTaskButton @buttonText="Test" />`);
        expect(find('button')).to.exist;
        expect(find('button')).to.contain.text('Test');
        expect(find('button').disabled).to.be.false;

        await render(hbs`<GhTaskButton @class="testing" />`);
        expect(find('button')).to.have.class('testing');
        // default button text is "Save"
        expect(find('button')).to.contain.text('Save');

        // passes disabled attr
        await render(hbs`<GhTaskButton @disabled={{true}} @buttonText="Test" />`);
        expect(find('button').disabled).to.be.true;
        // allows button text to be set via hash param
        expect(find('button')).to.contain.text('Test');

        // passes type attr
        await render(hbs`<GhTaskButton @type="submit" />`);
        expect(find('button')).to.have.attr('type', 'submit');

        // passes tabindex attr
        await render(hbs`<GhTaskButton @tabindex="-1" />`);
        expect(find('button')).to.have.attr('tabindex', '-1');
    });

    it('shows spinner whilst running', async function () {
        defineProperty(this, 'myTask', task(function* () {
            yield timeout(50);
        }));

        await render(hbs`<GhTaskButton @task={{myTask}} />`);

        this.myTask.perform();

        await waitFor('button svg', {timeout: 50});
    });

    it('shows running text when passed whilst running', async function () {
        defineProperty(this, 'myTask', task(function* () {
            yield timeout(50);
        }));

        await render(hbs`<GhTaskButton @task={{myTask}} @runningText="Running" />`);

        this.myTask.perform();

        await waitFor('button svg', {timeout: 50});
        expect(find('button')).to.contain.text('Running');
    });

    it('appears disabled whilst running', async function () {
        defineProperty(this, 'myTask', task(function* () {
            yield timeout(50);
        }));

        await render(hbs`<GhTaskButton @task={{myTask}} />`);
        expect(find('button'), 'initial class').to.not.have.class('appear-disabled');

        this.myTask.perform();

        await waitFor('button.appear-disabled', {timeout: 100});
        await settled();

        expect(find('button'), 'ended class').to.not.have.class('appear-disabled');
    });

    it('shows success on success', async function () {
        defineProperty(this, 'myTask', task(function* () {
            yield timeout(1);
            return true;
        }));

        await render(hbs`<GhTaskButton @task={{myTask}} />`);

        await this.myTask.perform();

        expect(find('button')).to.have.class('gh-btn-green');
        expect(find('button')).to.contain.text('Saved');
    });

    it('assigns specified success class on success', async function () {
        defineProperty(this, 'myTask', task(function* () {
            yield timeout(1);
            return true;
        }));

        await render(hbs`<GhTaskButton @task={{myTask}} @successClass="im-a-success" />`);

        await this.myTask.perform();

        expect(find('button')).to.not.have.class('gh-btn-green');
        expect(find('button')).to.have.class('im-a-success');
        expect(find('button')).to.contain.text('Saved');
    });

    it('shows failure when task errors', async function () {
        defineProperty(this, 'myTask', task(function* () {
            try {
                yield timeout(1);
                throw new ReferenceError('test error');
            } catch (error) {
                // noop, prevent mocha triggering unhandled error assert
            }
        }));

        await render(hbs`<GhTaskButton @task={{myTask}} @failureClass="is-failed" />`);

        this.myTask.perform();
        await waitFor('button.is-failed');

        expect(find('button')).to.contain.text('Retry');
    });

    it('shows failure on falsy response', async function () {
        defineProperty(this, 'myTask', task(function* () {
            yield timeout(1);
            return false;
        }));

        await render(hbs`<GhTaskButton @task={{myTask}} />`);

        this.myTask.perform();
        await waitFor('button.gh-btn-red', {timeout: 50});

        expect(find('button')).to.contain.text('Retry');
    });

    it('shows idle on canceled response', async function () {
        defineProperty(this, 'myTask', task(function* () {
            yield timeout(1);
            return 'canceled';
        }));

        await render(hbs`<GhTaskButton @task={{myTask}} />`);

        this.myTask.perform();
        await waitFor('[data-test-task-button-state="idle"]', {timeout: 50});
    });

    it('assigns specified failure class on failure', async function () {
        defineProperty(this, 'myTask', task(function* () {
            yield timeout(1);
            return false;
        }));

        await render(hbs`<GhTaskButton @task={{myTask}} @failureClass="im-a-failure" />`);

        this.myTask.perform();

        await waitFor('button.im-a-failure', {timeout: 50});

        expect(find('button')).to.not.have.class('gh-btn-red');
        expect(find('button')).to.contain.text('Retry');
    });

    it('performs task on click', async function () {
        let taskCount = 0;

        defineProperty(this, 'myTask', task(function* () {
            yield timeout(1);
            taskCount = taskCount + 1;
        }));

        await render(hbs`<GhTaskButton @task={{myTask}} />`);
        await click('button');

        expect(taskCount, 'taskCount').to.equal(1);
    });

    it('@useAccentColor=true adds style attr', async function () {
        defineProperty(this, 'myTask', task(function* () {
            yield timeout(1);
        }));

        await render(hbs`<GhTaskButton @task={{myTask}} @useAccentColor={{true}} />`);

        expect(find('button')).to.have.attr('style', 'background-color: #123456');
    });

    it('@useAccentColor=true removes style attr when in failure state', async function () {
        defineProperty(this, 'myTask', task(function* () {
            yield timeout(1);
            return false;
        }));

        await render(hbs`<GhTaskButton @task={{myTask}} @useAccentColor={{false}} />`);
        await click('button');
        await waitFor('button.gh-btn-red', {timeout: 50});

        expect(find('button')).to.contain.text('Retry');
        expect(find('button')).not.to.have.attr('style');
    });

    it('@useAccentColor=false does not add style attr', async function () {
        defineProperty(this, 'myTask', task(function* () {
            yield timeout(1);
        }));

        await render(hbs`<GhTaskButton @task={{myTask}} @useAccentColor={{false}} />`);

        expect(find('button')).not.to.have.attr('style');
    });
});
