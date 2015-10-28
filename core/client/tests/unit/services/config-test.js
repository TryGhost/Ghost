/* jshint expr:true */
import { expect } from 'chai';
import {
    describeModule,
    it
} from 'ember-mocha';

import Ember from 'ember';

describeModule(
    'service:config',
    'Unit: Service: config',
    {
        // Specify the other units that are required for this test.
        // needs: ['service:foo']
    },
    function () {
        // Replace this with your real tests.
        it('exists', function () {
            const service = this.subject();
            expect(service).to.be.ok;
        });

        it('correctly parses a client secret', function () {
            Ember.$('<meta>').attr('name', 'env-clientSecret')
                .attr('content', '23e435234423')
                .appendTo('head');

            const service = this.subject();

            expect(service.get('clientSecret')).to.equal('23e435234423');
        });
    }
);
