import {describe, expect, it} from 'vitest';
import {getAllByRole, render, screen} from '@testing-library/react';
import {buildCardMenu} from '../../src/utils/buildCardMenu';

const Icon = () => <svg title="icon" />;

describe('buildCardMenu', function () {
    it('renders', async function () {
        const nodes = [
            ['one', {kgMenu: {
                label: 'One',
                desc: 'Card test one',
                Icon,
                insertCommand: 'insert_card_one'
            }}],
            ['two', {kgMenu: {
                label: 'Two',
                desc: 'Card test two',
                Icon,
                insertCommand: 'insert_card_two'
            }}]
        ];

        const cardMenu = buildCardMenu(nodes);

        render(<>{cardMenu}</>);

        const sections = screen.getAllByRole('separator');

        expect(sections).toHaveLength(1);
        expect(sections[0]).toHaveTextContent('Primary');

        const menuitems = getAllByRole(sections[0], 'menuitem');

        expect(menuitems).toHaveLength(2);
        expect(menuitems[0]).toHaveTextContent('One');
        expect(menuitems[1]).toHaveTextContent('Two');
    });

    it('can add cards to other headers', async function () {
        const nodes = [
            ['one', {kgMenu: {
                label: 'One',
                desc: 'Card test one',
                Icon,
                insertCommand: 'insert_card_one'
            }}],
            ['two', {kgMenu: {
                label: 'Two',
                desc: 'Card test two',
                section: 'Secondary',
                Icon,
                insertCommand: 'insert_card_two'
            }}]
        ];

        const cardMenu = buildCardMenu(nodes);

        render(<>{cardMenu}</>);

        const sections = screen.getAllByRole('separator');
        expect(sections).toHaveLength(2);
        expect(sections[0]).toHaveTextContent('Primary');
        expect(sections[1]).toHaveTextContent('Secondary');

        const sectionOneItems = getAllByRole(sections[0], 'menuitem');
        expect(sectionOneItems).toHaveLength(1);
        expect(sectionOneItems[0]).toHaveTextContent('One');

        const sectionTwoItems = getAllByRole(sections[1], 'menuitem');
        expect(sectionTwoItems).toHaveLength(1);
        expect(sectionTwoItems[0]).toHaveTextContent('Two');
    });

    it('can show multiple items for a single card', async function () {
        const nodes = [
            ['one', {kgMenu: [{
                label: 'One',
                desc: 'Card test one',
                Icon,
                insertCommand: 'insert_card_one'
            }, {
                label: 'Two',
                desc: 'Card test two',
                Icon,
                insertCommand: 'insert_card_two'
            }]}]
        ];

        const cardMenu = buildCardMenu(nodes);

        render(<>{cardMenu}</>);

        const sections = screen.getAllByRole('separator');
        expect(sections).toHaveLength(1);

        const menuitems = getAllByRole(sections[0], 'menuitem');
        expect(menuitems).toHaveLength(2);
        expect(menuitems[0]).toHaveTextContent('One');
        expect(menuitems[1]).toHaveTextContent('Two');
    });

    describe('filtering', function () {
        it('shows all items for blank query', async function () {
            const nodes = [
                ['one', {kgMenu: {
                    label: 'One',
                    desc: 'Card test one',
                    Icon,
                    insertCommand: 'insert_card_one',
                    matches: ['one']
                }}],
                ['two', {kgMenu: {
                    label: 'Two',
                    desc: 'Card test two',
                    Icon,
                    insertCommand: 'insert_card_two',
                    matches: ['two']
                }}]
            ];

            const cardMenu = buildCardMenu(nodes, {query: ''});

            render(<>{cardMenu}</>);

            const sections = screen.getAllByRole('separator');
            expect(sections).toHaveLength(1);

            const menuitems = screen.getAllByRole('menuitem');
            expect(menuitems).toHaveLength(2);
        });

        it('matches start of strings', async function () {
            const nodes = [
                ['one', {kgMenu: {
                    label: 'One',
                    desc: 'Card test one',
                    Icon,
                    insertCommand: 'insert_card_one',
                    matches: ['one']
                }}],
                ['two', {kgMenu: {
                    label: 'Two',
                    desc: 'Card test two',
                    Icon,
                    insertCommand: 'insert_card_two',
                    matches: ['two']
                }}]
            ];

            const cardMenu = buildCardMenu(nodes, {query: 't'});

            render(<>{cardMenu}</>);

            const sections = screen.getAllByRole('separator');
            expect(sections).toHaveLength(1);

            const menuitems = screen.getAllByRole('menuitem');
            expect(menuitems).toHaveLength(1);
            expect(menuitems[0]).toHaveTextContent('Two');
        });

        it('can match against multiple strings', async function () {
            const nodes = [
                ['one', {kgMenu: {
                    label: 'One',
                    desc: 'Card test one',
                    Icon,
                    insertCommand: 'insert_card_one',
                    matches: ['one']
                }}],
                ['two', {kgMenu: {
                    label: 'Two',
                    desc: 'Card test two',
                    Icon,
                    insertCommand: 'insert_card_two',
                    matches: ['two', 'multiple']
                }}]
            ];

            const cardMenu = buildCardMenu(nodes, {query: 'mul'});

            render(<>{cardMenu}</>);

            const sections = screen.getAllByRole('separator');
            expect(sections).toHaveLength(1);

            const menuitems = screen.getAllByRole('menuitem');
            expect(menuitems).toHaveLength(1);
            expect(menuitems[0]).toHaveTextContent('Two');
        });

        it('filters all sections', async function () {
            const nodes = [
                ['one', {kgMenu: {
                    label: 'One',
                    desc: 'Card test one',
                    Icon,
                    insertCommand: 'insert_card_one',
                    matches: ['one']
                }}],
                ['two', {kgMenu: {
                    label: 'Two',
                    desc: 'Card test two',
                    section: 'Secondary',
                    Icon,
                    insertCommand: 'insert_card_two',
                    matches: ['two', 'multiple']
                }}]
            ];

            const cardMenu = buildCardMenu(nodes, {query: 'mul'});

            render(<>{cardMenu}</>);

            const sections = screen.getAllByRole('separator');
            expect(sections).toHaveLength(1);
            expect(sections[0]).toHaveTextContent('Secondary');

            const menuitems = screen.getAllByRole('menuitem');
            expect(menuitems).toHaveLength(1);
            expect(menuitems[0]).toHaveTextContent('Two');
        });

        it('renders nothing with no matches', async function () {
            const nodes = [
                ['one', {kgMenu: {
                    label: 'One',
                    desc: 'Card test one',
                    Icon,
                    insertCommand: 'insert_card_one',
                    matches: ['one']
                }}],
                ['two', {kgMenu: {
                    label: 'Two',
                    desc: 'Card test two',
                    section: 'Secondary',
                    Icon,
                    insertCommand: 'insert_card_two',
                    matches: ['two', 'multiple']
                }}]
            ];

            const cardMenu = buildCardMenu(nodes, {query: 'unknown'});

            const {container} = render(<>{cardMenu}</>);

            expect(container.innerHTML).toEqual('');
        });

        it('is case-insensitive', async function () {
            const nodes = [
                ['one', {kgMenu: {
                    label: 'One',
                    desc: 'Card test one',
                    Icon,
                    insertCommand: 'insert_card_one',
                    matches: ['one']
                }}],
                ['two', {kgMenu: {
                    label: 'Two',
                    desc: 'Card test two',
                    Icon,
                    insertCommand: 'insert_card_two',
                    matches: ['two']
                }}]
            ];

            const cardMenu = buildCardMenu(nodes, {query: 'Tw'});

            render(<>{cardMenu}</>);

            const sections = screen.getAllByRole('separator');
            expect(sections).toHaveLength(1);

            const menuitems = screen.getAllByRole('menuitem');
            expect(menuitems).toHaveLength(1);
            expect(menuitems[0]).toHaveTextContent('Two');
        });
    });
});
