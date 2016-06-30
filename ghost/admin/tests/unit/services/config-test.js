/* jshint expr:true */
import { expect } from 'chai';
import {
    describeModule,
    it
} from 'ember-mocha';
import $ from 'jquery';

describeModule(
    'service:config',
    'Unit: Service: config',
    {},
    function () {
        // Replace this with your real tests.
        it('exists', function () {
            let service = this.subject();
            expect(service).to.be.ok;
        });

        it('correctly parses a client secret', function () {
            $('<meta>').attr('name', 'env-clientSecret')
                .attr('content', '23e435234423')
                .appendTo('head');

            let service = this.subject();

            expect(service.get('clientSecret')).to.equal('23e435234423');
        });
    }
);
