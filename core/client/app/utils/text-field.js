import Ember from 'ember';

const {TextField} = Ember;

TextField.reopen({
    attributeBindings: ['autofocus']
});
