/* jshint expr:true */
import {expect} from 'chai';
import {describe, it} from 'mocha';
import {setupComponentTest} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';
import {task, timeout} from 'ember-concurrency';
import run from 'ember-runloop';
import wait from 'ember-test-helpers/wait';

describe('Integration: Component: gh-task-button', function() {
    setupComponentTest('gh-task-button', {
        integration: true
    });

    it('renders', function () {
        this.render(hbs`{{#gh-task-button}}Test{{/gh-task-button}}`);
        expect(this.$('button')).to.exist;
        expect(this.$('button')).to.contain('Test');
        expect(this.$('button')).to.have.prop('disabled', false);

        this.render(hbs`{{#gh-task-button class="testing"}}Test{{/gh-task-button}}`);
        expect(this.$('button')).to.have.class('testing');

        this.render(hbs`{{#gh-task-button disabled=true}}Test{{/gh-task-button}}`);
        expect(this.$('button')).to.have.prop('disabled', true);

        this.render(hbs`{{#gh-task-button type="submit"}}Test{{/gh-task-button}}`);
        expect(this.$('button')).to.have.attr('type', 'submit');

        this.render(hbs`{{#gh-task-button tabindex="-1"}}Test{{/gh-task-button}}`);
        expect(this.$('button')).to.have.attr('tabindex', '-1');
    });

    it('shows spinner whilst running', function (done) {
        this.set('myTask', task(function* () {
            yield timeout(50);
        }));

        this.render(hbs`{{#gh-task-button task=myTask}}Test{{/gh-task-button}}`);

        this.get('myTask').perform();

        run.later(this, function () {
            expect(this.$('button')).to.have.descendants('span.spinner');
        }, 20);

        wait().then(done);
    });

    it('appears disabled whilst running', function (done) {
        this.set('myTask', task(function* () {
            yield timeout(50);
        }));

        this.render(hbs`{{#gh-task-button task=myTask}}Test{{/gh-task-button}}`);
        expect(this.$('button'), 'initial class').to.not.have.class('appear-disabled');

        this.get('myTask').perform();

        run.later(this, function () {
            expect(this.$('button'), 'running class').to.have.class('appear-disabled');
        }, 20);

        run.later(this, function () {
            expect(this.$('button'), 'ended class').to.not.have.class('appear-disabled');
        }, 70);

        wait().then(done);
    });

    it('performs task on click', function (done) {
        let taskCount = 0;

        this.set('myTask', task(function* () {
            yield timeout(50);
            taskCount = taskCount + 1;
        }));

        this.render(hbs`{{#gh-task-button task=myTask}}Test{{/gh-task-button}}`);
        this.$('button').click();

        wait().then(() => {
            expect(taskCount, 'taskCount').to.equal(1);
            done();
        });
    });

    it('keeps button size when showing spinner', function (done) {
        this.set('myTask', task(function* () {
            yield timeout(50);
        }));

        this.render(hbs`{{#gh-task-button task=myTask}}Test{{/gh-task-button}}`);
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
        }, 70);

        wait().then(done);
    });
});
