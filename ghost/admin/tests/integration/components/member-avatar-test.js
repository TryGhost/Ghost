import { expect } from 'chai';
import { describe, it } from 'mocha';
import { setupComponentTest } from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';

describe('Integration | Component | member-avatar', function() {
  setupComponentTest('member-avatar', {
    integration: true
  });

  it('renders', function() {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.on('myAction', function(val) { ... });
    // Template block usage:
    // this.render(hbs`
    //   {{#member-avatar}}
    //     template content
    //   {{/member-avatar}}
    // `);

    this.render(hbs`{{member-avatar}}`);
    expect(this.$()).to.have.length(1);
  });
});
