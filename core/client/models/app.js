import appFixtures from 'ghost/fixtures/apps';

var App = DS.Model.extend({
    name: DS.attr('string'),
    package: DS.attr(),
    active: DS.attr('boolean')
});

App.reopenClass({
    FIXTURES: appFixtures
});

export default App;
