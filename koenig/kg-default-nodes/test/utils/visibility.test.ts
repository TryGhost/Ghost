import {JSDOM} from 'jsdom';
import type {Visibility} from '../../src/utils/visibility.js';
import {hasRestrictedCards, isOldVisibilityFormat, isVisibilityRestricted, migrateOldVisibilityFormat, renderWithVisibility, buildDefaultVisibility} from '../../src/utils/visibility.js';

type VisibilityRenderOutput = Parameters<typeof renderWithVisibility>[0];

function getHTMLElement(element: VisibilityRenderOutput['element']): HTMLElement {
    if (!element || !('tagName' in element)) {
        throw new Error('Expected visibility renderer to return an HTMLElement');
    }

    return element as HTMLElement;
}

function getHTMLTextAreaElement(element: VisibilityRenderOutput['element']): HTMLTextAreaElement {
    if (!element || !('tagName' in element) || element.tagName !== 'TEXTAREA' || !('value' in element)) {
        throw new Error('Expected visibility renderer to return a textarea element');
    }

    return element as HTMLTextAreaElement;
}

describe('Utils: visibility', function () {
    describe('isOldVisibilityFormat', function () {
        it('returns true if visibility object does not have web property', function () {
            const visibility = {showOnWeb: true, email: {memberSegment: 'status:free,status:-free'}};
            expect(isOldVisibilityFormat(visibility)).toBe(true);
        });

        it('returns true if visibility does not have web.nonMember property', function () {
            const visibility = {web: {memberSegment: 'status:free,status:-free'}, email: {memberSegment: 'status:free,status:-free'}};
            expect(isOldVisibilityFormat(visibility)).toBe(true);
        });

        it('returns true if visibility object does not have email property', function () {
            const visibility = {web: {nonMember: true, memberSegment: 'status:free,status:-free'}, showOnEmail: true};
            expect(isOldVisibilityFormat(visibility)).toBe(true);
        });

        it('returns true for incorrectly migrated old format', function () {
            const visibility = {emailOnly: false, segment: '', web: {memberSegment: ''}, email: {memberSegment: ''}};
            expect(isOldVisibilityFormat(visibility)).toBe(true);
        });

        it('returns false if visibility object has web, web.nonMember, and email properties', function () {
            const visibility = {web: {nonMember: true, memberSegment: ''}, email: {memberSegment: ''}};
            expect(isOldVisibilityFormat(visibility)).toBe(false);
        });
    });

    describe('isVisibilityRestricted', function () {
        it('returns false if old showOnWeb/showOnEmail visibility format is visible to all', function () {
            const visibility = {showOnWeb: true, showOnEmail: true, segment: ''};
            expect(isVisibilityRestricted(visibility)).toBe(false);
        });

        it('returns false if old emailOnly format is visible to all', function () {
            const visibility = {emailOnly: false, segment: ''};
            expect(isVisibilityRestricted(visibility)).toBe(false);
        });

        it('returns false if old visibility format relies on default segment behavior', function () {
            const visibility = {};
            expect(isVisibilityRestricted(visibility)).toBe(false);
        });

        it('returns true if old visibility format has showOnEmail === false', function () {
            const visibility = {showOnEmail: false};
            expect(isVisibilityRestricted(visibility)).toBe(true);
        });

        it('returns true if old visibility format has showOnWeb === false', function () {
            const visibility = {showOnWeb: false};
            expect(isVisibilityRestricted(visibility)).toBe(true);
        });

        it('returns true if old visibility format targets a specific email segment', function () {
            const visibility = {showOnEmail: true, segment: 'status:free'};
            expect(isVisibilityRestricted(visibility)).toBe(true);
        });

        it('returns true if old visibility format has emailOnly === true', function () {
            const visibility = {emailOnly: true, segment: ''};
            expect(isVisibilityRestricted(visibility)).toBe(true);
        });

        it('returns true if new visibility format has web.nonMember === false', function () {
            const visibility = {web: {nonMember: false, memberSegment: 'status:free,status:-free'}, email: {memberSegment: 'status:free,status:-free'}};
            expect(isVisibilityRestricted(visibility)).toBe(true);
        });

        it('returns true if new visibility format has web.memberSegment !== ALL_MEMBERS_SEGMENT', function () {
            const visibility = {web: {nonMember: true, memberSegment: 'status:free'}, email: {memberSegment: 'status:free,status:-free'}};
            expect(isVisibilityRestricted(visibility)).toBe(true);
        });

        it('returns true if new visibility format has email.memberSegment !== ALL_MEMBERS_SEGMENT', function () {
            const visibility = {web: {nonMember: true, memberSegment: 'status:free,status:-free'}, email: {memberSegment: 'status:free'}};
            expect(isVisibilityRestricted(visibility)).toBe(true);
        });

        it('returns false if new visibility format is visible to all', function () {
            const visibility = {web: {nonMember: true, memberSegment: 'status:free,status:-free'}, email: {memberSegment: 'status:free,status:-free'}};
            expect(isVisibilityRestricted(visibility)).toBe(false);
        });
    });

    describe('hasRestrictedCards', function () {
        const ALL = 'status:free,status:-free';

        function doc(children: unknown[]) {
            return JSON.stringify({root: {type: 'root', children}});
        }

        function card(visibility: Visibility) {
            return {type: 'html', html: '<p>Card</p>', visibility};
        }

        it('returns false for an empty document', function () {
            expect(hasRestrictedCards(null)).toBe(false);
            expect(hasRestrictedCards(undefined)).toBe(false);
            expect(hasRestrictedCards('')).toBe(false);
        });

        it('returns false when no card has visibility settings', function () {
            const lexical = doc([
                {type: 'paragraph', children: [{type: 'text', text: 'Hello'}]},
                {type: 'image', src: '/image.jpg'}
            ]);
            expect(hasRestrictedCards(lexical)).toBe(false);
        });

        it('returns false when every card is visible to everyone', function () {
            const lexical = doc([card({web: {nonMember: true, memberSegment: ALL}, email: {memberSegment: ALL}})]);
            expect(hasRestrictedCards(lexical)).toBe(false);
        });

        it('returns true when a card is restricted', function () {
            const lexical = doc([card({web: {nonMember: true, memberSegment: ALL}, email: {memberSegment: 'status:free'}})]);
            expect(hasRestrictedCards(lexical)).toBe(true);
        });

        it('returns true when a card uses the old restricted format', function () {
            const lexical = doc([card({emailOnly: true, segment: ''})]);
            expect(hasRestrictedCards(lexical)).toBe(true);
        });

        it('returns true when a restricted card is nested', function () {
            const lexical = doc([{type: 'list', children: [{type: 'listitem', children: [card({showOnWeb: false})]}]}]);
            expect(hasRestrictedCards(lexical)).toBe(true);
        });

        it('accepts a parsed document', function () {
            const lexical = JSON.parse(doc([card({showOnWeb: false})]));
            expect(hasRestrictedCards(lexical)).toBe(true);
        });
    });

    describe('migrateOldVisibilityFormat', function () {
        it('returns visibility directly if it matches new format', function () {
            // old format values do not match new, simulating newer data being set
            // should return visibility as-is rather than converting anything
            const before = {emailOnly: true, segment: '', web: {nonMember: true, memberSegment: 'status:free'}, email: {memberSegment: 'status:free'}};
            const refCheck = JSON.parse(JSON.stringify(before));
            const after = migrateOldVisibilityFormat(before);

            // we get same reference back
            expect(Object.is(before, after)).toBe(true);
            // original reference is unchanged
            expect(before).toEqual(refCheck);
        });

        it('keeps original properties when migrating to new format', function () {
            const after = migrateOldVisibilityFormat({showOnWeb: false});
            expect(after.showOnWeb).toBe(false);
        });

        describe('web', function () {
            function testWebMigration(before: Visibility, after: Visibility['web']) {
                return function () {
                    const result = migrateOldVisibilityFormat(before);
                    expect(result.web).toEqual(after);
                };
            }

            it('uses default visibility when showOnWeb and emailOnly are not set', testWebMigration(
                {},
                buildDefaultVisibility().web
            ));

            it('handles {emailOnly: false} as visible to all', testWebMigration(
                {emailOnly: false},
                {nonMember: true, memberSegment: 'status:free,status:-free'}
            ));

            it('handles {emailOnly: true} as visible to none', testWebMigration(
                {emailOnly: true},
                {nonMember: false, memberSegment: ''}
            ));

            it('does not use "segment" for web segments with {emailOnly: false}', testWebMigration(
                {emailOnly: false, segment: 'status:free'},
                {nonMember: true, memberSegment: 'status:free,status:-free'}
            ));

            it('handles {showOnWeb: false} as visible to none', testWebMigration(
                {showOnWeb: false},
                {nonMember: false, memberSegment: ''}
            ));

            it('handles {showOnWeb: true} as visible to all', testWebMigration(
                {showOnWeb: true},
                {nonMember: true, memberSegment: 'status:free,status:-free'}
            ));

            it('does not use "segment" for web segments with {showOnWeb: true}', testWebMigration(
                {showOnWeb: true, segment: 'status:free'},
                {nonMember: true, memberSegment: 'status:free,status:-free'}
            ));
        });

        describe('email', function () {
            function testEmailMigration(before: Visibility, after: Visibility['email']) {
                return function () {
                    const result = migrateOldVisibilityFormat(before);
                    expect(result.email).toEqual(after);
                };
            }

            it('uses default visibility if showOnEmail and emailOnly are not set', testEmailMigration(
                {},
                buildDefaultVisibility().email
            ));

            it('handles {showOnEmail: false} as no visibility', testEmailMigration(
                {showOnEmail: false},
                {memberSegment: ''}
            ));

            it('handles {showOnEmail: false, segment: "status:free"} as no visibility', testEmailMigration(
                {showOnEmail: false},
                {memberSegment: ''}
            ));

            it('handles {showOnEmail: true, segment: ""} as visible to all', testEmailMigration(
                {showOnEmail: true},
                {memberSegment: 'status:free,status:-free'}
            ));

            it('handles {showOnEmail: true, segment: "status:free"} as visible to free', testEmailMigration(
                {showOnEmail: true, segment: 'status:free'},
                {memberSegment: 'status:free'}
            ));

            it('handles {showOnEmail: true, segment: "status:paid"} as visible to paid', testEmailMigration(
                {showOnEmail: true, segment: 'status:paid'},
                {memberSegment: 'status:-free'}
            ));

            it('handles {showOnEmail: true, segment: "status:-free+status:-paid"} as no visible', testEmailMigration(
                {showOnEmail: true, segment: 'status:-free+status:-paid'},
                {memberSegment: ''}
            ));

            it('handles {emailOnly: false, segment: ""} as visible to all', testEmailMigration(
                {emailOnly: false},
                {memberSegment: 'status:free,status:-free'}
            ));
        });
    });

    // Each shape below is new-format data with a channel or key left out.
    // Missing values take the public default; supplied values are kept.
    describe('partial new-format visibility', function () {
        let document: Document;

        beforeAll(function () {
            document = (new JSDOM()).window.document;
        });

        function render(visibility: Visibility, target: string) {
            const p = document.createElement('p');
            p.innerHTML = 'testing';
            return renderWithVisibility({element: p, type: 'html'} as VisibilityRenderOutput, visibility, {target});
        }

        function expectHidden(result: VisibilityRenderOutput) {
            expect(getHTMLElement(result.element).tagName).toBe('SPAN');
            expect(getHTMLElement(result.element).innerHTML).toBe('');
        }

        function expectUnchanged(result: VisibilityRenderOutput) {
            expect(getHTMLElement(result.element).tagName).toBe('P');
            expect(getHTMLElement(result.element).innerHTML).toBe('testing');
        }

        function expectWebGate(result: VisibilityRenderOutput, gate: string) {
            expect(getHTMLTextAreaElement(result.element).value).toBe(`\n<!--kg-gated-block:begin ${gate} --><p>testing</p><!--kg-gated-block:end-->\n`);
        }

        function expectEmailSegment(result: VisibilityRenderOutput, segment: string) {
            expect(getHTMLElement(result.element).tagName).toBe('DIV');
            expect(getHTMLElement(result.element).dataset.ghSegment).toBe(segment);
            expect(getHTMLElement(result.element).innerHTML).toBe('<p>testing</p>');
        }

        describe('only web supplied, hidden on web', function () {
            const visibility = (): Visibility => ({web: {nonMember: false, memberSegment: ''}});

            it('keeps web hidden when only web is supplied', function () {
                expect(migrateOldVisibilityFormat(visibility())).toEqual({
                    web: {nonMember: false, memberSegment: ''},
                    email: {memberSegment: 'status:free,status:-free'}
                });
            });

            it('reports a web-only hidden card as restricted', function () {
                expect(isVisibilityRestricted(visibility())).toBe(true);
            });

            it('renders nothing on web when only a hidden web channel is supplied', function () {
                expectHidden(render(visibility(), 'web'));
            });

            it('sends to all email recipients when the email channel is missing', function () {
                expectUnchanged(render(visibility(), 'email'));
            });
        });

        describe('only email supplied, free members only', function () {
            const visibility = (): Visibility => ({email: {memberSegment: 'status:free'}});

            it('keeps the email segment when only email is supplied', function () {
                expect(migrateOldVisibilityFormat(visibility())).toEqual({
                    web: {nonMember: true, memberSegment: 'status:free,status:-free'},
                    email: {memberSegment: 'status:free'}
                });
            });

            it('reports an email-only free segment as restricted', function () {
                expect(isVisibilityRestricted(visibility())).toBe(true);
            });

            it('wraps email output in the free segment when only email is supplied', function () {
                expectEmailSegment(render(visibility(), 'email'), 'status:free');
            });

            it('shows on web to everyone when the web channel is missing', function () {
                expectUnchanged(render(visibility(), 'web'));
            });
        });

        describe('web supplied without nonMember', function () {
            const visibility = (): Visibility => ({
                web: {memberSegment: 'status:-free'},
                email: {memberSegment: 'status:free,status:-free'}
            });

            it('keeps the web member segment when nonMember is missing', function () {
                expect(migrateOldVisibilityFormat(visibility())).toEqual({
                    web: {nonMember: true, memberSegment: 'status:-free'},
                    email: {memberSegment: 'status:free,status:-free'}
                });
            });

            it('reports a paid-only web segment without nonMember as restricted', function () {
                expect(isVisibilityRestricted(visibility())).toBe(true);
            });

            it('gates web output to the supplied segment when nonMember is missing', function () {
                expectWebGate(render(visibility(), 'web'), 'nonMember:true memberSegment:"status:-free"');
            });
        });

        describe('memberSegment: null in one channel', function () {
            it('keeps the web setting when email.memberSegment is null', function () {
                const visibility = {
                    web: {nonMember: false, memberSegment: 'status:free'},
                    email: {memberSegment: null}
                } as unknown as Visibility;

                expect(migrateOldVisibilityFormat(visibility)).toEqual({
                    web: {nonMember: false, memberSegment: 'status:free'},
                    email: {memberSegment: 'status:free,status:-free'}
                });
                expect(isVisibilityRestricted(visibility)).toBe(true);
                expectWebGate(render(visibility, 'web'), 'nonMember:false memberSegment:"status:free"');
                expectUnchanged(render(visibility, 'email'));
            });

            it('keeps the email setting and nonMember when web.memberSegment is null', function () {
                const visibility = {
                    web: {nonMember: false, memberSegment: null},
                    email: {memberSegment: 'status:-free'}
                } as unknown as Visibility;

                expect(migrateOldVisibilityFormat(visibility)).toEqual({
                    web: {nonMember: false, memberSegment: 'status:free,status:-free'},
                    email: {memberSegment: 'status:-free'}
                });
                expect(isVisibilityRestricted(visibility)).toBe(true);
                expectWebGate(render(visibility, 'web'), 'nonMember:false memberSegment:"status:free,status:-free"');
                expectEmailSegment(render(visibility, 'email'), 'status:-free');
            });
        });

        it('does not mutate the supplied partial object', function () {
            const visibility: Visibility = {web: {nonMember: false, memberSegment: ''}};
            migrateOldVisibilityFormat(visibility);
            expect(visibility).toEqual({web: {nonMember: false, memberSegment: ''}});
        });
    });

    // Pins legacy conversion and full new-format handling so the partial
    // format fix cannot change them.
    describe('legacy and full formats (regression)', function () {
        const ALL = 'status:free,status:-free';
        const cases: Array<[string, Visibility, Visibility['web'], Visibility['email'], boolean]> = [
            ['{}', {}, {nonMember: true, memberSegment: ALL}, {memberSegment: ALL}, false],
            ['{emailOnly: false}', {emailOnly: false}, {nonMember: true, memberSegment: ALL}, {memberSegment: ALL}, false],
            ['{emailOnly: true}', {emailOnly: true}, {nonMember: false, memberSegment: ''}, {memberSegment: ALL}, true],
            ['{emailOnly: true, segment: "status:free"}', {emailOnly: true, segment: 'status:free'}, {nonMember: false, memberSegment: ''}, {memberSegment: 'status:free'}, true],
            ['{showOnWeb: true, showOnEmail: true}', {showOnWeb: true, showOnEmail: true}, {nonMember: true, memberSegment: ALL}, {memberSegment: ALL}, false],
            ['{showOnWeb: false, showOnEmail: true}', {showOnWeb: false, showOnEmail: true}, {nonMember: false, memberSegment: ''}, {memberSegment: ALL}, true],
            ['{showOnWeb: true, showOnEmail: false}', {showOnWeb: true, showOnEmail: false}, {nonMember: true, memberSegment: ALL}, {memberSegment: ''}, true],
            ['{showOnWeb: true}', {showOnWeb: true}, {nonMember: true, memberSegment: ALL}, {memberSegment: ALL}, false],
            ['{showOnWeb: false}', {showOnWeb: false}, {nonMember: false, memberSegment: ''}, {memberSegment: ALL}, true],
            ['{showOnEmail: false}', {showOnEmail: false}, {nonMember: true, memberSegment: ALL}, {memberSegment: ''}, true],
            ['{showOnEmail: false, segment: "status:free"}', {showOnEmail: false, segment: 'status:free'}, {nonMember: true, memberSegment: ALL}, {memberSegment: ''}, true],
            ['segment ""', {showOnEmail: true, segment: ''}, {nonMember: true, memberSegment: ALL}, {memberSegment: ALL}, false],
            ['segment "status:free"', {showOnEmail: true, segment: 'status:free'}, {nonMember: true, memberSegment: ALL}, {memberSegment: 'status:free'}, true],
            ['segment "status:paid"', {showOnEmail: true, segment: 'status:paid'}, {nonMember: true, memberSegment: ALL}, {memberSegment: 'status:-free'}, true],
            ['segment "status:-free"', {showOnEmail: true, segment: 'status:-free'}, {nonMember: true, memberSegment: ALL}, {memberSegment: 'status:-free'}, true],
            ['segment "status:-free+status:-paid"', {showOnEmail: true, segment: 'status:-free+status:-paid'}, {nonMember: true, memberSegment: ALL}, {memberSegment: ''}, true],
            ['legacy keys alongside partial new keys', {emailOnly: false, segment: '', web: {memberSegment: ''}, email: {memberSegment: ''}}, {nonMember: true, memberSegment: ALL}, {memberSegment: ALL}, false]
        ];

        cases.forEach(([label, before, web, email, restricted]) => {
            it(`converts legacy ${label}`, function () {
                const result = migrateOldVisibilityFormat(JSON.parse(JSON.stringify(before)));
                expect(result.web).toEqual(web);
                expect(result.email).toEqual(email);
                expect(isVisibilityRestricted(JSON.parse(JSON.stringify(before)))).toBe(restricted);
            });
        });

        it('returns a full new-format object unchanged', function () {
            const before: Visibility = {web: {nonMember: false, memberSegment: 'status:-free'}, email: {memberSegment: ''}};
            const after = migrateOldVisibilityFormat(before);
            expect(after).toBe(before);
            expect(after).toEqual({web: {nonMember: false, memberSegment: 'status:-free'}, email: {memberSegment: ''}});
            expect(isVisibilityRestricted(before)).toBe(true);
        });
    });

    describe('renderWithVisibility', function () {
        let document: Document;

        beforeAll(function () {
            document = (new JSDOM()).window.document;
        });

        function buildVisibility(visibility: Partial<Visibility>) {
            return {...buildDefaultVisibility(), ...visibility};
        }

        function runRender(html: string, visibility: Partial<Visibility>, target: string) {
            const visibilityWithDefaults = buildVisibility(visibility);

            const p = document.createElement('p');
            p.innerHTML = html;

            const originalOutput = {
                element: p,
                type: 'html'
            } as VisibilityRenderOutput;
            return renderWithVisibility(originalOutput, visibilityWithDefaults, {target});
        }

        describe('email target', function () {
            it('returns empty container when membersSegment === no members', function () {
                const visibility = {email: {memberSegment: ''}};
                const result = runRender('testing', visibility, 'email');

                expect(getHTMLElement(result.element).tagName).toBe('SPAN');
                expect(getHTMLElement(result.element).innerHTML).toBe('');
                expect(result.type).toBe('inner');
            });

            it('returns original output when membersSegment === all members', function () {
                const visibility = {email: {memberSegment: 'status:free,status:-free'}};
                const result = runRender('testing', visibility, 'email');

                expect(getHTMLElement(result.element).tagName).toEqual('P');
                expect(getHTMLElement(result.element).innerHTML).toBe('testing');
                expect(result.type).toBe('html');
            });

            it('wraps original output when emailing a specific segment', function () {
                const visibility = {email: {memberSegment: 'status:free'}};
                const result = runRender('testing', visibility, 'email');

                expect(getHTMLElement(result.element).tagName).toEqual('DIV');
                expect(getHTMLElement(result.element).dataset.ghSegment!).toBe('status:free');
                expect(getHTMLElement(result.element).innerHTML).toBe('<p>testing</p>');
                expect(result.type).toBe('html');
            });
        });

        describe('web target', function () {
            it('returns original output when no restrictions placed on web visibility', function () {
                const visibility = {web: {nonMember: true, memberSegment: 'status:free,status:-free'}};
                const result = runRender('testing', visibility, 'web');

                expect(getHTMLElement(result.element).tagName).toEqual('P');
                expect(getHTMLElement(result.element).innerHTML).toBe('testing');
                expect(result.type).toBe('html');
            });

            it('adds wrapping comments when anonymous is gated', function () {
                const visibility = {web: {nonMember: false, memberSegment: 'status:free,status:-free'}};
                const result = runRender('testing', visibility, 'web');

                expect(getHTMLTextAreaElement(result.element).tagName).toBe('TEXTAREA');
                expect(getHTMLTextAreaElement(result.element).value).toBe('\n<!--kg-gated-block:begin nonMember:false memberSegment:"status:free,status:-free" --><p>testing</p><!--kg-gated-block:end-->\n');
            });

            it('hides a card whose member segment isn\'t one of Ghost\'s own', function () {
                const badSegment = {web: {nonMember: false, memberSegment: 'status:gold'}};
                const result = runRender('testing', badSegment as Partial<Visibility>, 'web');

                expect(getHTMLElement(result.element).tagName).toBe('SPAN');
                expect(getHTMLElement(result.element).innerHTML).toBe('');

                // Visitors who aren't members don't see it either
                const shownToVisitors = runRender('testing', {web: {nonMember: true, memberSegment: 'status:gold'}} as Partial<Visibility>, 'web');
                expect(getHTMLElement(shownToVisitors.element).tagName).toBe('SPAN');
                expect(getHTMLElement(shownToVisitors.element).innerHTML).toBe('');
            });

            it('treats a visitor setting that isn\'t true or false as false', function () {
                const notBoolean = {web: {nonMember: 'yes', memberSegment: 'status:free'}};
                const gated = runRender('testing', notBoolean as unknown as Partial<Visibility>, 'web');
                expect(getHTMLTextAreaElement(gated.element).value).toBe('\n<!--kg-gated-block:begin nonMember:false memberSegment:"status:free" --><p>testing</p><!--kg-gated-block:end-->\n');
            });

            it('adds wrapping comments when member segment is gated', function () {
                const visibility = {web: {nonMember: true, memberSegment: 'status:free'}};
                const result = runRender('testing', visibility, 'web');

                expect(getHTMLTextAreaElement(result.element).tagName).toBe('TEXTAREA');
                expect(getHTMLTextAreaElement(result.element).value).toBe('\n<!--kg-gated-block:begin nonMember:true memberSegment:"status:free" --><p>testing</p><!--kg-gated-block:end-->\n');
            });
        });

        it('handles no render type', function () {
            const visibility = buildVisibility({web: {nonMember: true, memberSegment: 'status:free'}});
            const p = document.createElement('p');
            p.innerHTML = 'testing';
            const originalOutput = {element: p, type: 'outer'} as VisibilityRenderOutput;

            const result = renderWithVisibility(originalOutput, buildVisibility(visibility), {target: 'web'});

            expect(getHTMLTextAreaElement(result.element).tagName).toBe('TEXTAREA');
            expect(getHTMLTextAreaElement(result.element).value).toBe('\n<!--kg-gated-block:begin nonMember:true memberSegment:"status:free" --><p>testing</p><!--kg-gated-block:end-->\n');
        });

        it('handles inner render type', function () {
            const visibility = buildVisibility({web: {nonMember: true, memberSegment: 'status:free'}});
            const div = document.createElement('div');
            div.innerHTML = '<!--comment test--><span>testing</span>';
            const originalOutput = {element: div, type: 'inner'} as VisibilityRenderOutput;

            const result = renderWithVisibility(originalOutput, buildVisibility(visibility), {target: 'web'});

            expect(getHTMLTextAreaElement(result.element).tagName).toBe('TEXTAREA');
            expect(getHTMLTextAreaElement(result.element).value).toBe('\n<!--kg-gated-block:begin nonMember:true memberSegment:"status:free" --><!--comment test--><span>testing</span><!--kg-gated-block:end-->\n');
        });

        it('handles value render type', function () {
            const visibility = buildVisibility({web: {nonMember: true, memberSegment: 'status:free'}});
            const textarea = document.createElement('textarea');
            textarea.value = '<!--comment test--><span>testing</span>';
            const originalOutput = {element: textarea, type: 'value'} as VisibilityRenderOutput;

            const result = renderWithVisibility(originalOutput, buildVisibility(visibility), {target: 'web'});

            expect(getHTMLTextAreaElement(result.element).tagName).toBe('TEXTAREA');
            expect(getHTMLTextAreaElement(result.element).value).toBe('\n<!--kg-gated-block:begin nonMember:true memberSegment:"status:free" --><!--comment test--><span>testing</span><!--kg-gated-block:end-->\n');
        });

        it('handles old beta visibility format', function () {
            const visibility = {
                showOnWeb: true,
                showOnEmail: true,
                segment: 'status:free'
            };

            const p = document.createElement('p');
            p.innerHTML = 'testing';

            const originalOutput = {
                element: p,
                type: 'html'
            } as VisibilityRenderOutput;
            const result = renderWithVisibility(originalOutput, visibility, {target: 'email'});

            expect(getHTMLElement(result.element).tagName).toEqual('DIV');
            expect(getHTMLElement(result.element).dataset.ghSegment!).toBe('status:free');
            expect(getHTMLElement(result.element).innerHTML).toBe('<p>testing</p>');
            expect(result.type).toBe('html');
        });
    });
});
