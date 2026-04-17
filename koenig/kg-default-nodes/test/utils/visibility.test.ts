const {JSDOM} = require('jsdom');
const {utils} = require('../../');
const {isOldVisibilityFormat, isVisibilityRestricted, migrateOldVisibilityFormat, renderWithVisibility, buildDefaultVisibility} = utils.visibility;

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

        it('returns true if old visibility format has showOnEmail === false', function () {
            const visibility = {showOnEmail: false};
            isVisibilityRestricted(visibility).should.be.true();
        });

        it('returns true if old visibility format has showOnWeb === false', function () {
            const visibility = {showOnWeb: false};
            isVisibilityRestricted(visibility).should.be.true();
        });

        it('returns true if old visibility format has segment !== ""', function () {
            const visibility = {segment: 'status:free'};
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
            function testWebMigration(before, after) {
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
            function testEmailMigration(before, after) {
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
        let document;

        before(function () {
            document = (new JSDOM()).window.document;
        });

        function buildVisibility(visibility) {
            return {...buildDefaultVisibility(), ...visibility};
        }

        function runRender(html, visibility, target) {
            const visibilityWithDefaults = buildVisibility(visibility);

            const p = document.createElement('p');
            p.innerHTML = html;

            const originalOutput = {
                element: p,
                type: 'html'
            };
            return renderWithVisibility(originalOutput, visibilityWithDefaults, {target});
        }

        describe('email target', function () {
            it('returns empty container when membersSegment === no members', function () {
                const visibility = {email: {memberSegment: ''}};
                const result = runRender('testing', visibility, 'email');

                result.element.tagName.should.equal('SPAN');
                result.element.innerHTML.should.equal('');
                result.type.should.equal('inner');
            });

            it('returns original output when membersSegment === all members', function () {
                const visibility = {email: {memberSegment: 'status:free,status:-free'}};
                const result = runRender('testing', visibility, 'email');

                result.element.tagName.should.eql('P');
                result.element.innerHTML.should.equal('testing');
                result.type.should.equal('html');
            });

            it('wraps original output when emailing a specific segment', function () {
                const visibility = {email: {memberSegment: 'status:free'}};
                const result = runRender('testing', visibility, 'email');

                result.element.tagName.should.eql('DIV');
                result.element.dataset.ghSegment.should.equal('status:free');
                result.element.innerHTML.should.equal('<p>testing</p>');
                result.type.should.equal('html');
            });
        });

        describe('web target', function () {
            it('returns original output when no restrictions placed on web visibility', function () {
                const visibility = {web: {nonMember: true, memberSegment: 'status:free,status:-free'}};
                const result = runRender('testing', visibility, 'web');

                result.element.tagName.should.eql('P');
                result.element.innerHTML.should.equal('testing');
                result.type.should.equal('html');
            });

            it('adds wrapping comments when anonymous is gated', function () {
                const visibility = {web: {nonMember: false, memberSegment: 'status:free,status:-free'}};
                const result = runRender('testing', visibility, 'web');

                result.element.tagName.should.equal('TEXTAREA');
                result.element.value.should.equal('\n<!--kg-gated-block:begin nonMember:false memberSegment:"status:free,status:-free" --><p>testing</p><!--kg-gated-block:end-->\n');
            });

            it('adds wrapping comments when member segment is gated', function () {
                const visibility = {web: {nonMember: true, memberSegment: 'status:free'}};
                const result = runRender('testing', visibility, 'web');

                result.element.tagName.should.equal('TEXTAREA');
                result.element.value.should.equal('\n<!--kg-gated-block:begin nonMember:true memberSegment:"status:free" --><p>testing</p><!--kg-gated-block:end-->\n');
            });
        });

        it('handles no render type', function () {
            const visibility = buildVisibility({web: {nonMember: true, memberSegment: 'status:free'}});
            const p = document.createElement('p');
            p.innerHTML = 'testing';
            const originalOutput = {element: p};

            const result = renderWithVisibility(originalOutput, buildVisibility(visibility), {target: 'web'});

            result.element.tagName.should.equal('TEXTAREA');
            result.element.value.should.equal('\n<!--kg-gated-block:begin nonMember:true memberSegment:"status:free" --><p>testing</p><!--kg-gated-block:end-->\n');
        });

        it('handles inner render type', function () {
            const visibility = buildVisibility({web: {nonMember: true, memberSegment: 'status:free'}});
            const div = document.createElement('div');
            div.innerHTML = '<!--comment test--><span>testing</span>';
            const originalOutput = {element: div, type: 'inner'};

            const result = renderWithVisibility(originalOutput, buildVisibility(visibility), {target: 'web'});

            result.element.tagName.should.equal('TEXTAREA');
            result.element.value.should.equal('\n<!--kg-gated-block:begin nonMember:true memberSegment:"status:free" --><!--comment test--><span>testing</span><!--kg-gated-block:end-->\n');
        });

        it('handles value render type', function () {
            const visibility = buildVisibility({web: {nonMember: true, memberSegment: 'status:free'}});
            const input = document.createElement('input');
            input.value = '<!--comment test--><span>testing</span>';
            const originalOutput = {element: input, type: 'value'};

            const result = renderWithVisibility(originalOutput, buildVisibility(visibility), {target: 'web'});

            result.element.tagName.should.equal('TEXTAREA');
            result.element.value.should.equal('\n<!--kg-gated-block:begin nonMember:true memberSegment:"status:free" --><!--comment test--><span>testing</span><!--kg-gated-block:end-->\n');
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
            };
            const result = renderWithVisibility(originalOutput, visibility, {target: 'email'});

            result.element.tagName.should.eql('DIV');
            result.element.dataset.ghSegment.should.equal('status:free');
            result.element.innerHTML.should.equal('<p>testing</p>');
            result.type.should.equal('html');
        });
    });
});
