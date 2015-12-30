/* jshint expr:true */
import { expect } from 'chai';
import {
  describeComponent,
  it
} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';

describeComponent(
  'gh-client-edit',
  'Integration: GhClientEditComponent',
  {
    integration: true
  },
  function() {
    it('renders', function() {
      // Set any properties with this.set('myProperty', 'value');
      // Handle any actions with this.on('myAction', function(val) { ... });
      // Template block usage:
      // this.render(hbs`
      //   {{#gh-client-edit}}
      //     template content
      //   {{/gh-client-edit}}
      // `);

      this.render(hbs`{{gh-client-edit}}`);
      expect(this.$()).to.have.length(1);
    });
  }
);
