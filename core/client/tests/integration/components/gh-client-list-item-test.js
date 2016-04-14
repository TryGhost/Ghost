/* jshint expr:true */
import { expect } from 'chai';
import {
  describeComponent,
  it
} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';

describeComponent(
  'gh-client-list-item',
  'Integration: GhClientListItemComponent',
  {
    integration: true
  },
  function() {
    it('renders', function() {
      // Set any properties with this.set('myProperty', 'value');
      // Handle any actions with this.on('myAction', function(val) { ... });
      // Template block usage:
      // this.render(hbs`
      //   {{#gh-client-list-item}}
      //     template content
      //   {{/gh-client-list-item}}
      // `);

      this.render(hbs`{{gh-client-list-item}}`);
      expect(this.$()).to.have.length(1);
    });
  }
);
