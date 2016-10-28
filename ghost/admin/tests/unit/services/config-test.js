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
    }
);
