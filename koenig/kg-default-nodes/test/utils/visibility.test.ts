import {JSDOM} from 'jsdom';
import type {Visibility} from '../../src/utils/visibility.js';
import {isOldVisibilityFormat, isVisibilityRestricted, migrateOldVisibilityFormat, renderWithVisibility, buildDefaultVisibility} from '../../src/utils/visibility.js';

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
            isOldVisibilityFormat(visibility).should.be.true();
        });

        it('returns true if visibility does not have web.nonMember property', function () {
            const visibility = {web: {memberSegment: 'status:free,status:-free'}, email: {memberSegment: 'status:free,status:-free'}};
            isOldVisibilityFormat(visibility).should.be.true();
        });

        it('returns true if visibility object does not have email property', function () {
            const visibility = {web: {nonMember: true, memberSegment: 'status:free,status:-free'}, showOnEmail: true};
            isOldVisibilityFormat(visibility).should.be.true();
        });

        it('returns true for incorrectly migrated old format', function () {
            const visibility = {emailOnly: false, segment: '', web: {memberSegment: ''}, email: {memberSegment: ''}};
            isOldVisibilityFormat(visibility).should.be.true();
        });

        it('returns false if visibility object has web, web.nonMember, and email properties', function () {
            const visibility = {web: {nonMember: true, memberSegment: ''}, email: {memberSegment: ''}};
            isOldVisibilityFormat(visibility).should.be.false();
        });
    });

    describe('isVisibilityRestricted', function () {
        it('returns false if old showOnWeb/showOnEmail visibility format is visible to all', function () {
            const visibility = {showOnWeb: true, showOnEmail: true, segment: ''};
            isVisibilityRestricted(visibility).should.be.false();
        });

        it('returns false if old emailOnly format is visible to all', function () {
            const visibility = {emailOnly: false, segment: ''};
            isVisibilityRestricted(visibility).should.be.false();
        });

        it('returns false if old visibility format relies on default segment behavior', function () {
            const visibility = {};
            isVisibilityRestricted(visibility).should.be.false();
        });

        it('returns true if old visibility format has showOnEmail === false', function () {
            const visibility = {showOnEmail: false};
            isVisibilityRestricted(visibility).should.be.true();
        });

        it('returns true if old visibility format has showOnWeb === false', function () {
            const visibility = {showOnWeb: false};
            isVisibilityRestricted(visibility).should.be.true();
        });

        it('returns true if old visibility format targets a specific email segment', function () {
            const visibility = {showOnEmail: true, segment: 'status:free'};
            isVisibilityRestricted(visibility).should.be.true();
        });

        it('returns true if old visibility format has emailOnly === true', function () {
            const visibility = {emailOnly: true, segment: ''};
            isVisibilityRestricted(visibility).should.be.true();
        });

        it('returns true if new visibility format has web.nonMember === false', function () {
            const visibility = {web: {nonMember: false, memberSegment: 'status:free,status:-free'}, email: {memberSegment: 'status:free,status:-free'}};
            isVisibilityRestricted(visibility).should.be.true();
        });

        it('returns true if new visibility format has web.memberSegment !== ALL_MEMBERS_SEGMENT', function () {
            const visibility = {web: {nonMember: true, memberSegment: 'status:free'}, email: {memberSegment: 'status:free,status:-free'}};
            isVisibilityRestricted(visibility).should.be.true();
        });

        it('returns true if new visibility format has email.memberSegment !== ALL_MEMBERS_SEGMENT', function () {
            const visibility = {web: {nonMember: true, memberSegment: 'status:free,status:-free'}, email: {memberSegment: 'status:free'}};
            isVisibilityRestricted(visibility).should.be.true();
        });

        it('returns false if new visibility format is visible to all', function () {
            const visibility = {web: {nonMember: true, memberSegment: 'status:free,status:-free'}, email: {memberSegment: 'status:free,status:-free'}};
            isVisibilityRestricted(visibility).should.be.false();
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
            Object.is(before, after).should.be.true();
            // original reference is unchanged
            before.should.deepEqual(refCheck);
        });

        it('keeps original properties when migrating to new format', function () {
            const after = migrateOldVisibilityFormat({showOnWeb: false});
            after.showOnWeb.should.be.false();
        });

        describe('web', function () {
            function testWebMigration(before: Visibility, after: Visibility['web']) {
                return function () {
                    const result = migrateOldVisibilityFormat(before);
                    result.web.should.deepEqual(after);
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
                    result.email.should.deepEqual(after);
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

    describe('renderWithVisibility', function () {
        let document: Document;

        before(function () {
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

                getHTMLElement(result.element).tagName.should.equal('SPAN');
                getHTMLElement(result.element).innerHTML.should.equal('');
                result.type.should.equal('inner');
            });

            it('returns original output when membersSegment === all members', function () {
                const visibility = {email: {memberSegment: 'status:free,status:-free'}};
                const result = runRender('testing', visibility, 'email');

                getHTMLElement(result.element).tagName.should.eql('P');
                getHTMLElement(result.element).innerHTML.should.equal('testing');
                result.type.should.equal('html');
            });

            it('wraps original output when emailing a specific segment', function () {
                const visibility = {email: {memberSegment: 'status:free'}};
                const result = runRender('testing', visibility, 'email');

                getHTMLElement(result.element).tagName.should.eql('DIV');
                getHTMLElement(result.element).dataset.ghSegment!.should.equal('status:free');
                getHTMLElement(result.element).innerHTML.should.equal('<p>testing</p>');
                result.type.should.equal('html');
            });
        });

        describe('web target', function () {
            it('returns original output when no restrictions placed on web visibility', function () {
                const visibility = {web: {nonMember: true, memberSegment: 'status:free,status:-free'}};
                const result = runRender('testing', visibility, 'web');

                getHTMLElement(result.element).tagName.should.eql('P');
                getHTMLElement(result.element).innerHTML.should.equal('testing');
                result.type.should.equal('html');
            });

            it('adds wrapping comments when anonymous is gated', function () {
                const visibility = {web: {nonMember: false, memberSegment: 'status:free,status:-free'}};
                const result = runRender('testing', visibility, 'web');

                getHTMLTextAreaElement(result.element).tagName.should.equal('TEXTAREA');
                getHTMLTextAreaElement(result.element).value.should.equal('\n<!--kg-gated-block:begin nonMember:false memberSegment:"status:free,status:-free" --><p>testing</p><!--kg-gated-block:end-->\n');
            });

            it('adds wrapping comments when member segment is gated', function () {
                const visibility = {web: {nonMember: true, memberSegment: 'status:free'}};
                const result = runRender('testing', visibility, 'web');

                getHTMLTextAreaElement(result.element).tagName.should.equal('TEXTAREA');
                getHTMLTextAreaElement(result.element).value.should.equal('\n<!--kg-gated-block:begin nonMember:true memberSegment:"status:free" --><p>testing</p><!--kg-gated-block:end-->\n');
            });
        });

        it('handles no render type', function () {
            const visibility = buildVisibility({web: {nonMember: true, memberSegment: 'status:free'}});
            const p = document.createElement('p');
            p.innerHTML = 'testing';
            const originalOutput = {element: p, type: 'outer'} as VisibilityRenderOutput;

            const result = renderWithVisibility(originalOutput, buildVisibility(visibility), {target: 'web'});

            getHTMLTextAreaElement(result.element).tagName.should.equal('TEXTAREA');
            getHTMLTextAreaElement(result.element).value.should.equal('\n<!--kg-gated-block:begin nonMember:true memberSegment:"status:free" --><p>testing</p><!--kg-gated-block:end-->\n');
        });

        it('handles inner render type', function () {
            const visibility = buildVisibility({web: {nonMember: true, memberSegment: 'status:free'}});
            const div = document.createElement('div');
            div.innerHTML = '<!--comment test--><span>testing</span>';
            const originalOutput = {element: div, type: 'inner'} as VisibilityRenderOutput;

            const result = renderWithVisibility(originalOutput, buildVisibility(visibility), {target: 'web'});

            getHTMLTextAreaElement(result.element).tagName.should.equal('TEXTAREA');
            getHTMLTextAreaElement(result.element).value.should.equal('\n<!--kg-gated-block:begin nonMember:true memberSegment:"status:free" --><!--comment test--><span>testing</span><!--kg-gated-block:end-->\n');
        });

        it('handles value render type', function () {
            const visibility = buildVisibility({web: {nonMember: true, memberSegment: 'status:free'}});
            const textarea = document.createElement('textarea');
            textarea.value = '<!--comment test--><span>testing</span>';
            const originalOutput = {element: textarea, type: 'value'} as VisibilityRenderOutput;

            const result = renderWithVisibility(originalOutput, buildVisibility(visibility), {target: 'web'});

            getHTMLTextAreaElement(result.element).tagName.should.equal('TEXTAREA');
            getHTMLTextAreaElement(result.element).value.should.equal('\n<!--kg-gated-block:begin nonMember:true memberSegment:"status:free" --><!--comment test--><span>testing</span><!--kg-gated-block:end-->\n');
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

            getHTMLElement(result.element).tagName.should.eql('DIV');
            getHTMLElement(result.element).dataset.ghSegment!.should.equal('status:free');
            getHTMLElement(result.element).innerHTML.should.equal('<p>testing</p>');
            result.type.should.equal('html');
        });
    });
});
