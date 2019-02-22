import { expect } from 'chai';
import { describe, it } from 'mocha';
import { setupComponentTest } from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';

describe('Integration | Component | modal-delete-member', function() {
  setupComponentTest('modal-delete-member', {
    integration: true
  });

  it('renders', function() {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.on('myAction', function(val) { ... });
    // Template block usage:
    // this.render(hbs`
    //   {{#modal-delete-member}}
    //     template content
    //   {{/modal-delete-member}}
    // `);

    this.render(hbs`{{modal-delete-member}}`);
    expect(this.$()).to.have.length(1);
  });
});
