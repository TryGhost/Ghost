import EmailPreview from 'ghost-admin/components/editor/publish-options/email-preview';
import {describe, it} from 'mocha';
import {expect} from 'chai';

const TIERS = [
    {slug: 'gold', name: 'Gold'},
    {slug: 'silver', name: 'Silver'}
];

// built without the constructor so the unit test needs no container or store -
// the tier list is injected directly rather than fetched
function buildComponent({previewFilter = null, defaultPreviewFilter = 'status:free', tiers = TIERS} = {}) {
    const component = Object.create(EmailPreview.prototype);
    const changes = [];

    component.args = {
        publishOptions: {
            previewFilter,
            defaultPreviewFilter,
            availableTiers: tiers,
            previewHiddenSegments: [],
            setPreviewFilter: newFilter => changes.push(newFilter)
        }
    };

    return {component, changes};
}

describe('Unit: Component: editor/publish-options/email-preview', function () {
    // the closing line affirms what the answer means, so it has to stay a
    // sentence rather than turn into a list to decode
    describe('the closing summary', function () {
        it('names free members', function () {
            const {component} = buildComponent({previewFilter: 'status:free'});

            expect(component.previewSummary).to.equal('Free members');
        });

        it('names paid members', function () {
            const {component} = buildComponent({previewFilter: 'status:-free'});

            expect(component.previewSummary).to.equal('Paid members');
        });

        it('names a single tier', function () {
            const {component} = buildComponent({previewFilter: 'tier:gold'});

            expect(component.previewSummary).to.equal('Gold');
        });

        it('collapses both statuses into all members', function () {
            const {component} = buildComponent({previewFilter: 'status:free,status:-free'});

            expect(component.previewSummary).to.equal('All members');
        });

        it('falls back to selected members for a mixed audience', function () {
            const {component} = buildComponent({previewFilter: 'status:free,tier:gold'});

            expect(component.previewSummary).to.equal('Selected members');
        });

        it('falls back to selected members for a label', function () {
            const {component} = buildComponent({previewFilter: 'label:vip'});

            expect(component.previewSummary).to.equal('Selected members');
        });

        // with no yes/no control, an empty selection is the "no" - the template
        // says so outright rather than leaving the step looking unfinished
        it('says nothing when the selection is empty', function () {
            const {component} = buildComponent({previewFilter: null});

            expect(component.previewSummary).to.equal(null);
        });
    });
});
