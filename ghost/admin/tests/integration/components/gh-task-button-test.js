import hbs from 'htmlbars-inline-precompile';
import wait from 'ember-test-helpers/wait';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {run} from '@ember/runloop';
import {setupComponentTest} from 'ember-mocha';
import {task, timeout} from 'ember-concurrency';

describe('Integration: Component: gh-task-button', function () {
    setupComponentTest('gh-task-button', {
        integration: true
    });

    it('renders', function () {
        // sets button text using positional param
        this.render(hbs`{{gh-task-button "Test"}}`);
        expect(this.$('button')).to.exist;
        expect(this.$('button')).to.contain('Test');
        expect(this.$('button')).to.have.prop('disabled', false);

        this.render(hbs`{{gh-task-button class="testing"}}`);
        expect(this.$('button')).to.have.class('testing');
        // default button text is "Save"
        expect(this.$('button')).to.contain('Save');

        // passes disabled attr
        this.render(hbs`{{gh-task-button disabled=true buttonText="Test"}}`);
        expect(this.$('button')).to.have.prop('disabled', true);
        // allows button text to be set via hash param
        expect(this.$('button')).to.contain('Test');

        // passes type attr
        this.render(hbs`{{gh-task-button type="submit"}}`);
        expect(this.$('button')).to.have.attr('type', 'submit');

        // passes tabindex attr
        this.render(hbs`{{gh-task-button tabindex="-1"}}`);
        expect(this.$('button')).to.have.attr('tabindex', '-1');
    });

    it('shows spinner whilst running', function (done) {
        this.set('myTask', task(function* () {
            yield timeout(50);
        }));

        this.render(hbs`{{gh-task-button task=myTask}}`);

        this.get('myTask').perform();

        run.later(this, function () {
            expect(this.$('button')).to.have.descendants('svg');
        }, 20);

        wait().then(done);
    });

    it('shows running text when passed whilst running', function (done) {
        this.set('myTask', task(function* () {
            yield timeout(50);
        }));

        this.render(hbs`{{gh-task-button task=myTask runningText="Running"}}`);

        this.get('myTask').perform();

        run.later(this, function () {
            expect(this.$('button')).to.have.descendants('svg');
            expect(this.$('button')).to.contain('Running');
        }, 20);

        wait().then(done);
    });

    it('appears disabled whilst running', function (done) {
        this.set('myTask', task(function* () {
            yield timeout(50);
        }));

        this.render(hbs`{{gh-task-button task=myTask}}`);
        expect(this.$('button'), 'initial class').to.not.have.class('appear-disabled');

        this.get('myTask').perform();

        run.later(this, function () {
            expect(this.$('button'), 'running class').to.have.class('appear-disabled');
        }, 20);

        run.later(this, function () {
            expect(this.$('button'), 'ended class').to.not.have.class('appear-disabled');
        }, 100);

        wait().then(done);
    });

    it('shows success on success', function (done) {
        this.set('myTask', task(function* () {
            yield timeout(50);
            return true;
        }));

        this.render(hbs`{{gh-task-button task=myTask}}`);

        this.get('myTask').perform();

        run.later(this, function () {
            expect(this.$('button')).to.have.class('gh-btn-green');
            expect(this.$('button')).to.contain('Saved');
        }, 100);

        wait().then(done);
    });

    it('assigns specified success class on success', function (done) {
        this.set('myTask', task(function* () {
            yield timeout(50);
            return true;
        }));

        this.render(hbs`{{gh-task-button task=myTask successClass="im-a-success"}}`);

        this.get('myTask').perform();

        run.later(this, function () {
            expect(this.$('button')).to.not.have.class('gh-btn-green');
            expect(this.$('button')).to.have.class('im-a-success');
            expect(this.$('button')).to.contain('Saved');
        }, 100);

        wait().then(done);
    });

    it('shows failure when task errors', function (done) {
        this.set('myTask', task(function* () {
            try {
                yield timeout(50);
                throw new ReferenceError('test error');
            } catch (error) {
                // noop, prevent mocha triggering unhandled error assert
            }
        }));

        this.render(hbs`{{gh-task-button task=myTask}}`);

        this.get('myTask').perform();

        run.later(this, function () {
            expect(this.$('button')).to.have.class('gh-btn-red');
            expect(this.$('button')).to.contain('Retry');
        }, 100);

        wait().then(done);
    });

    it('shows failure on falsy response', function (done) {
        this.set('myTask', task(function* () {
            yield timeout(50);
            return false;
        }));

        this.render(hbs`{{gh-task-button task=myTask}}`);

        this.get('myTask').perform();

        run.later(this, function () {
            expect(this.$('button')).to.have.class('gh-btn-red');
            expect(this.$('button')).to.contain('Retry');
        }, 100);

        wait().then(done);
    });

    it('assigns specified failure class on failure', function (done) {
        this.set('myTask', task(function* () {
            yield timeout(50);
            return false;
        }));

        this.render(hbs`{{gh-task-button task=myTask failureClass="im-a-failure"}}`);

        this.get('myTask').perform();

        run.later(this, function () {
            expect(this.$('button')).to.not.have.class('gh-btn-red');
            expect(this.$('button')).to.have.class('im-a-failure');
            expect(this.$('button')).to.contain('Retry');
        }, 100);

        wait().then(done);
    });

    it('performs task on click', function (done) {
        let taskCount = 0;

        this.set('myTask', task(function* () {
            yield timeout(50);
            taskCount = taskCount + 1;
        }));

        this.render(hbs`{{gh-task-button task=myTask}}`);
        this.$('button').click();

        wait().then(() => {
            expect(taskCount, 'taskCount').to.equal(1);
            done();
        });
    });

    it.skip('keeps button size when showing spinner', function (done) {
        this.set('myTask', task(function* () {
            yield timeout(50);
        }));

        this.render(hbs`{{gh-task-button task=myTask}}`);
        let width = this.$('button').width();
        let height = this.$('button').height();
        expect(this.$('button')).to.not.have.attr('style');

        this.get('myTask').perform();

        run.later(this, function () {
            // we can't test exact width/height because Chrome/Firefox use different rounding methods
            // expect(this.$('button')).to.have.attr('style', `width: ${width}px; height: ${height}px;`);

            let [widthInt] = width.toString().split('.');
            let [heightInt] = height.toString().split('.');

            expect(this.$('button').attr('style')).to.have.string(`width: ${widthInt}`);
            expect(this.$('button').attr('style')).to.have.string(`height: ${heightInt}`);
        }, 20);

        run.later(this, function () {
            // chai-jquery test doesn't work because Firefox outputs blank string
            // expect(this.$('button')).to.not.have.attr('style');
            expect(this.$('button').attr('style')).to.be.blank;
        }, 100);

        wait().then(done);
    });
});
