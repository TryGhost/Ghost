import Ember from 'ember';

export default Ember.Component.extend({
    model: {
        element: '.posts-list li:nth-child(1)',
        position: 'middle right',
        placement: 'top',
        title: 'Managing your content',
        content: `<p>The content screen is where all your blog’s posts live. You can browse through them just like you would an email inbox; with posts on the left and a preview on the right. <strong>Double click on any post to edit it!</strong></p>`.htmlSafe()
    },
    showTourItem: true,

    actions: {
        optOut() {
            console.log('opting out of all tour items...');
        },

        closeItem() {
            console.log('closing this item, moving on to next one...');
        }
    }
});
