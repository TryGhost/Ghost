import {click, findAll, render, triggerKeyEvent} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {hbs} from 'ember-cli-htmlbars';
import {setupRenderingTest} from 'ember-mocha';

describe('Integration: Component: tabs/tabs', function () {
    setupRenderingTest();

    it('renders', async function () {
        await render(hbs`
            <Tabs::Tabs class="test-tab" as |tabs|>
                <tabs.tab>Tab 1</tabs.tab>
                <tabs.tab>Tab 2</tabs.tab>

                <tabs.tabPanel>Content 1</tabs.tabPanel>
                <tabs.tabPanel>Content 2</tabs.tabPanel>
            </Tabs::Tabs>`);

        const tabButtons = findAll('.tab');
        const tabPanels = findAll('.tab-panel');

        expect(findAll('.test-tab').length).to.equal(1);
        expect(findAll('.tab-list').length).to.equal(1);
        expect(tabPanels.length).to.equal(2);
        expect(tabButtons.length).to.equal(2);

        expect(findAll('.tab-selected').length).to.equal(1);
        expect(findAll('.tab-panel-selected').length).to.equal(1);
        expect(tabButtons[0]).to.have.class('tab-selected');
        expect(tabPanels[0]).to.have.class('tab-panel-selected');

        expect(tabButtons[0]).to.have.trimmed.text('Tab 1');
        expect(tabButtons[1]).to.have.trimmed.text('Tab 2');

        expect(tabPanels[0]).to.have.trimmed.text('Content 1');
        expect(tabPanels[1]).to.have.trimmed.text('');
    });

    it('renders expected content on click', async function () {
        await render(hbs`
            <Tabs::Tabs class="test-tab" as |tabs|>
                <tabs.tab>Tab 1</tabs.tab>
                <tabs.tab>Tab 2</tabs.tab>

                <tabs.tabPanel>Content 1</tabs.tabPanel>
                <tabs.tabPanel>Content 2</tabs.tabPanel>
            </Tabs::Tabs>`);

        const tabButtons = findAll('.tab');
        const tabPanels = findAll('.tab-panel');

        await click(tabButtons[1]);

        expect(findAll('.tab-selected').length).to.equal(1);
        expect(findAll('.tab-panel-selected').length).to.equal(1);
        expect(tabButtons[1]).to.have.class('tab-selected');
        expect(tabPanels[1]).to.have.class('tab-panel-selected');

        expect(tabPanels[0]).to.have.trimmed.text('');
        expect(tabPanels[1]).to.have.trimmed.text('Content 2');
    });

    it('renders expected content on keyup event', async function () {
        await render(hbs`
            <Tabs::Tabs class="test-tab" as |tabs|>
                <tabs.tab>Tab 0</tabs.tab>
                <tabs.tab>Tab 1</tabs.tab>
                <tabs.tab>Tab 2</tabs.tab>

                <tabs.tabPanel>Content 0</tabs.tabPanel>
                <tabs.tabPanel>Content 1</tabs.tabPanel>
                <tabs.tabPanel>Content 2</tabs.tabPanel>
            </Tabs::Tabs>`);

        const tabButtons = findAll('.tab');
        const tabPanels = findAll('.tab-panel');

        const isTabRenders = (num) => {
            expect(tabButtons[num]).to.have.class('tab-selected');
            expect(tabPanels[num]).to.have.class('tab-panel-selected');

            expect(tabPanels[num]).to.have.trimmed.text(`Content ${num}`);
        };

        await triggerKeyEvent(tabButtons[0], 'keyup', 'ArrowRight');
        await triggerKeyEvent(tabButtons[1], 'keyup', 'ArrowRight');
        isTabRenders(2);

        await triggerKeyEvent(tabButtons[2], 'keyup', 'ArrowRight');
        isTabRenders(0);

        await triggerKeyEvent(tabButtons[0], 'keyup', 'ArrowLeft');
        isTabRenders(2);

        await triggerKeyEvent(tabButtons[2], 'keyup', 'ArrowLeft');
        isTabRenders(1);

        await triggerKeyEvent(tabButtons[0], 'keyup', 'Home');
        isTabRenders(0);

        await triggerKeyEvent(tabButtons[0], 'keyup', 'End');
        isTabRenders(2);
    });

    it('renders content for all tabs with forceRender option', async function () {
        await render(hbs`
            <Tabs::Tabs class="test-tab" @forceRender={{true}} as |tabs|>
                <tabs.tab>Tab 1</tabs.tab>
                <tabs.tab>Tab 2</tabs.tab>

                <tabs.tabPanel>Content 1</tabs.tabPanel>
                <tabs.tabPanel>Content 2</tabs.tabPanel>
            </Tabs::Tabs>`);

        const tabButtons = findAll('.tab');
        const tabPanels = findAll('.tab-panel');

        expect(tabPanels[0]).to.have.trimmed.text('Content 1');
        expect(tabPanels[1]).to.have.trimmed.text('Content 2');

        await click(tabButtons[1]);

        expect(findAll('.tab-selected').length).to.equal(1);
        expect(findAll('.tab-panel-selected').length).to.equal(1);
        expect(tabButtons[1]).to.have.class('tab-selected');
        expect(tabPanels[1]).to.have.class('tab-panel-selected');

        expect(tabPanels[0]).to.have.trimmed.text('Content 1');
        expect(tabPanels[1]).to.have.trimmed.text('Content 2');
    });
});
