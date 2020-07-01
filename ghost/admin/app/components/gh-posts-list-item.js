import Component from '@ember/component';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';

export default Component.extend({
    session: service(),

    tagName: 'li',
    classNames: ['gh-list-row', 'gh-posts-list-item'],

    authorNames: computed('post.authors.[]', function () {
        let authors = this.get('post.authors');

        return authors.map(author => author.get('name') || author.get('email')).join(', ');
    })
});
