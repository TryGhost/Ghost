import Route from 'ember-route';
import Router from 'ember-router';
import {isEmberArray} from 'ember-array/utils';
import on from 'ember-evented/on';

export default function () {
    Route.reopen({
        // `titleToken` can either be a static string or a function
        // that accepts a model object and returns a string (or array
        // of strings if there are multiple tokens).
        titleToken: null,

        // `title` can either be a static string or a function
        // that accepts an array of tokens and returns a string
        // that will be the document title. The `collectTitleTokens` action
        // stops bubbling once a route is encountered that has a `title`
        // defined.
        title: null,

        actions: {
            collectTitleTokens(tokens) {
                let {titleToken} = this;
                let finalTitle;

                if (typeof this.titleToken === 'function') {
                    titleToken = this.titleToken(this.currentModel);
                }

                if (isEmberArray(titleToken)) {
                    tokens.unshift(...titleToken);
                } else if (titleToken) {
                    tokens.unshift(titleToken);
                }

                if (this.title) {
                    if (typeof this.title === 'function') {
                        finalTitle = this.title(tokens);
                    } else {
                        finalTitle = this.title;
                    }

                    this.router.setTitle(finalTitle);
                } else {
                    return true;
                }
            }
        }
    });

    Router.reopen({
        updateTitle: on('didTransition', function () {
            this.send('collectTitleTokens', []);
        }),

        setTitle(title) {
            window.document.title = title;
        }
    });
}
