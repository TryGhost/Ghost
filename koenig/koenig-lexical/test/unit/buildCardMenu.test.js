import {describe, expect, it} from 'vitest';
import {buildCardMenu} from '../../src/utils/buildCardMenu';

const Icon = () => {};

describe('buildCardMenu', function () {
    it('adds to Primary section by default', async function () {
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

        expect(cardMenu.menu).deep.equal(new Map([
            ['Primary', [
                {
                    label: 'One',
                    desc: 'Card test one',
                    Icon,
                    insertCommand: 'insert_card_one',
                    nodeType: 'one'
                },
                {
                    label: 'Two',
                    desc: 'Card test two',
                    Icon,
                    insertCommand: 'insert_card_two',
                    nodeType: 'two'
                }
            ]]
        ]));

        expect(cardMenu.maxItemIndex).to.equal(1);
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

        expect(cardMenu.menu).deep.equal(new Map([
            ['Primary', [
                {
                    label: 'One',
                    desc: 'Card test one',
                    Icon,
                    insertCommand: 'insert_card_one',
                    nodeType: 'one'
                }
            ]],
            ['Secondary', [
                {
                    label: 'Two',
                    desc: 'Card test two',
                    Icon,
                    insertCommand: 'insert_card_two',
                    nodeType: 'two',
                    section: 'Secondary'
                }
            ]]
        ]));

        expect(cardMenu.maxItemIndex).to.equal(1);
    });

    it('can add multiple items for a single card', async function () {
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

        expect(cardMenu.menu).deep.equal(new Map([
            ['Primary', [
                {
                    label: 'One',
                    desc: 'Card test one',
                    Icon,
                    insertCommand: 'insert_card_one',
                    nodeType: 'one'
                },
                {
                    label: 'Two',
                    desc: 'Card test two',
                    Icon,
                    insertCommand: 'insert_card_two',
                    nodeType: 'one'
                }
            ]]
        ]));
    });

    describe('filtering', function () {
        it('adds all items for blank query', async function () {
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

            expect(cardMenu.menu).deep.equal(new Map([
                ['Primary', [
                    {
                        label: 'One',
                        desc: 'Card test one',
                        Icon,
                        insertCommand: 'insert_card_one',
                        matches: ['one'],
                        nodeType: 'one'
                    },
                    {
                        label: 'Two',
                        desc: 'Card test two',
                        Icon,
                        insertCommand: 'insert_card_two',
                        matches: ['two'],
                        nodeType: 'two'
                    }
                ]]
            ]));
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

            expect(cardMenu.menu).deep.equal(new Map([
                ['Primary', [
                    {
                        label: 'Two',
                        desc: 'Card test two',
                        Icon,
                        insertCommand: 'insert_card_two',
                        matches: ['two'],
                        nodeType: 'two'
                    }
                ]]
            ]));

            expect(cardMenu.maxItemIndex).to.equal(0);
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

            expect(cardMenu.menu).deep.equal(new Map([
                ['Primary', [
                    {
                        label: 'Two',
                        desc: 'Card test two',
                        Icon,
                        insertCommand: 'insert_card_two',
                        matches: ['two', 'multiple'],
                        nodeType: 'two'
                    }
                ]]
            ]));

            expect(cardMenu.maxItemIndex).to.equal(0);
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

            expect(cardMenu.menu).deep.equal(new Map([
                ['Secondary', [
                    {
                        label: 'Two',
                        desc: 'Card test two',
                        section: 'Secondary',
                        Icon,
                        insertCommand: 'insert_card_two',
                        matches: ['two', 'multiple'],
                        nodeType: 'two'
                    }
                ]]
            ]));
        });

        it('returns empty menu with no matches', async function () {
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

            expect(cardMenu.menu).deep.equal(new Map());
            expect(cardMenu.maxItemIndex).to.equal(-1);
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

            expect(cardMenu.menu).deep.equal(new Map([
                ['Primary', [
                    {
                        label: 'Two',
                        desc: 'Card test two',
                        Icon,
                        insertCommand: 'insert_card_two',
                        matches: ['two'],
                        nodeType: 'two'
                    }
                ]]
            ]));
        });
    });
});
