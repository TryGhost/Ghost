import Route from '@ember/routing/route';
import Router from '@ember/routing/router';
import {isArray as isEmberArray} from '@ember/array';
import {on} from '@ember/object/evented';

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
