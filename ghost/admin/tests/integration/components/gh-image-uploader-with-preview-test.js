/* jshint expr:true */
import { expect } from 'chai';
import {
    describeComponent,
    it
} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';
import run from 'ember-runloop';
import sinon from 'sinon';

describeComponent(
    'gh-image-uploader-with-preview',
    'Integration: Component: gh-image-uploader-with-preview',
    {
        integration: true
    },
    function() {
        it('renders image if provided', function() {
            this.set('image', 'http://example.com/test.png');

            this.render(hbs`{{gh-image-uploader-with-preview image=image}}`);

            expect(this.$('.gh-image-uploader.-with-image').length).to.equal(1);
            expect(this.$('img').attr('src')).to.equal('http://example.com/test.png');
        });

        it('renders upload form when no image provided', function () {
            this.render(hbs`{{gh-image-uploader-with-preview image=image}}`);

            expect(this.$('input[type="file"]').length).to.equal(1);
        });

        it('triggers remove action when delete icon is clicked', function () {
            let remove = sinon.spy();
            this.set('remove', remove);
            this.set('image', 'http://example.com/test.png');

            this.render(hbs`{{gh-image-uploader-with-preview image=image remove=remove}}`);
            run(() => {
                this.$('.icon-trash').click();
            });

            expect(remove.calledOnce).to.be.true;
        });
    }
);
