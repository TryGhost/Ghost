/*global App */

App.Router.map(function () {
    'use strict';
    this.resource('posts');
    this.resource('post', {path: 'post/:id'}, function () {
        this.route('edit');
    });
});
