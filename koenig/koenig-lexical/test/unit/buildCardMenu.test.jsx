import {describe, expect, it} from 'vitest';
import {getAllByRole, render, screen} from '@testing-library/react';
import {buildCardMenu} from '../../src/utils/buildCardMenu';
import {ReactComponent as ImageCardIcon} from '../../src/assets/icons/kg-card-type-image.svg';

describe('buildCardMenu', function () {
    it('renders', async function () {
        const nodes = [
            ['one', {kgMenu: {
                label: 'One',
                desc: 'Card test one',
                Icon: ImageCardIcon,
                insertCommand: 'insert_card_one'
            }}],
            ['two', {kgMenu: {
                label: 'Two',
                desc: 'Card test two',
                Icon: ImageCardIcon,
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
                Icon: ImageCardIcon,
                insertCommand: 'insert_card_one'
            }}],
            ['two', {kgMenu: {
                label: 'Two',
                desc: 'Card test two',
                section: 'Secondary',
                Icon: ImageCardIcon,
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
                Icon: ImageCardIcon,
                insertCommand: 'insert_card_one'
            }, {
                label: 'Two',
                desc: 'Card test two',
                Icon: ImageCardIcon,
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
});
