const {JSDOM} = require('jsdom');
const {utils} = require('../../');
const {usesOldVisibilityFormat, migrateOldVisibilityFormat, renderWithVisibility, buildDefaultVisibility} = utils.visibility;

describe('Utils: visibility', function () {
    describe('usesOldVisibilityFormat', function () {
        it('returns true if visibility object does not have web property', function () {
            const visibility = {showOnWeb: true, email: {memberSegment: 'status:free,status:-free'}};
            usesOldVisibilityFormat(visibility).should.be.true();
        });

        it('returns true if visibility object does not have email property', function () {
            const visibility = {web: {nonMember: true, memberSegment: 'status:free,status:-free'}, showOnEmail: true};
            usesOldVisibilityFormat(visibility).should.be.true();
        });

        it('returns true if web object is missing nonMember property', function () {
            const visibility = {web: {memberSegment: 'status:free,status:-free'}, email: {memberSegment: 'status:free,status:-free'}};
            usesOldVisibilityFormat(visibility).should.be.true();
        });
    });

    describe('migrateOldVisibilityFormat', function () {
        it('creates new web property from showOnWeb:false', function () {
            const visibility = {showOnWeb: false};
            migrateOldVisibilityFormat(visibility);
            visibility.web.should.eql({nonMember: false, memberSegment: ''});
        });

        it('creates new web property from showOnWeb:true', function () {
            const visibility = {showOnWeb: true};
            migrateOldVisibilityFormat(visibility);
            visibility.web.should.eql({nonMember: true, memberSegment: 'status:free,status:-free'});
        });

        it('creates new email property from showOnEmail: false', function () {
            const visibility = {showOnEmail: false, segment: 'status:free'};
            migrateOldVisibilityFormat(visibility);
            visibility.email.should.eql({memberSegment: ''});
        });

        it('creates new email property from showOnEmail: true, segment:""', function () {
            const visibility = {showOnEmail: true, segment: ''};
            migrateOldVisibilityFormat(visibility);
            visibility.email.should.eql({memberSegment: 'status:free,status:-free'});
        });

        it('creates new email property from showOnEmail: true, segment:"status:free"', function () {
            const visibility = {showOnEmail: true, segment: 'status:free'};
            migrateOldVisibilityFormat(visibility);
            visibility.email.should.eql({memberSegment: 'status:free'});
        });

        it('leaves existing properties alone', function () {
            const visibility = {showOnWeb: true, segment: 'status:free'};
            migrateOldVisibilityFormat(visibility);
            visibility.showOnWeb.should.be.true();
            visibility.segment.should.eql('status:free');
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
