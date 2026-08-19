import {$createPaywallV2Node, PaywallV2Node} from '../../src/nodes/PaywallV2Node';
const {createHeadlessEditor} = require('@lexical/headless');

describe('PaywallV2Node defaults', function () {
    let editor;

    const editorTest = testFn => function () {
        return new Promise<void>((resolve, reject) => {
            editor.update(() => {
                try {
                    testFn();
                    resolve();
                } catch (e) {
                    reject(e);
                }
            });
        });
    };

    beforeEach(function () {
        editor = createHeadlessEditor({nodes: [PaywallV2Node]});
    });

    it('gives web and email their own copy', editorTest(function () {
        const json = $createPaywallV2Node({access: 'paid'}).exportJSON();

        expect(json.webHeading).toContain('This post is for paying subscribers only');
        expect(json.emailHeading).toContain('Upgrade to continue reading.');
        expect(json.webHeading).not.toEqual(json.emailHeading);
    }));

    // both surfaces ship body copy. On a paid post it's the same line either
    // way - the action that unblocks the reader doesn't change with the surface
    it('ships body copy on both surfaces', editorTest(function () {
        const json = $createPaywallV2Node({access: 'paid'}).exportJSON();

        expect(json.webTextValue).toContain('Become a paid member to keep reading.');
        expect(json.emailTextValue).toContain('Become a paid member to keep reading.');
    }));

    // the action differs by access level, so the web copy does too
    it('names the right action for each access level', editorTest(function () {
        const expected = {
            members: 'Sign up to keep reading.',
            paid: 'Become a paid member to keep reading.',
            tiers: 'Subscribe to keep reading.'
        };

        Object.entries(expected).forEach(([access, copy]) => {
            expect($createPaywallV2Node({access}).exportJSON().webTextValue, access).toContain(copy);
        });
    }));

    // an empty body would leave the card sitting on a placeholder
    it('never leaves the web body empty', editorTest(function () {
        ['members', 'paid', 'tiers'].forEach((access) => {
            const json = $createPaywallV2Node({access}).exportJSON();

            expect(json.webTextValue, access).toContain('<p>');
        });
    }));

    // an unanswered card renders as members-only, so its copy matches
    it('falls back to the members body when access is unanswered', editorTest(function () {
        const json = $createPaywallV2Node().exportJSON();

        expect(json.webTextValue).toContain('Sign up to keep reading');
    }));

    it('ships the heading bold as content, so it can be unbolded', editorTest(function () {
        const json = $createPaywallV2Node({access: 'paid'}).exportJSON();

        // bold lives in the markup rather than in a fixed style, so the editor,
        // the site and email all follow whatever the author does to it
        expect(json.webHeading).toMatch(/<(b|strong)>/);
        expect(json.emailHeading).toMatch(/<(b|strong)>/);
    }));

    it('leaves the body copy plain, so only the first line is emphasised', editorTest(function () {
        const json = $createPaywallV2Node({access: 'paid'}).exportJSON();

        expect(json.emailTextValue).not.toMatch(/<(b|strong)>/);
    }));

    it('matches the web heading to the access level', editorTest(function () {
        expect($createPaywallV2Node({access: 'members'}).exportJSON().webHeading).toContain('This post is for subscribers only');
        expect($createPaywallV2Node({access: 'tiers'}).exportJSON().webHeading).toContain('selected tiers only');
    }));
});
