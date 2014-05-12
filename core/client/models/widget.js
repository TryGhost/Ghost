/*global window, document, Ghost, $, _, Backbone */
(function () {
    'use strict';

    Ghost.Models.Widget = Ghost.ProgressModel.extend({

        defaults: {
            title: '',
            name: '',
            author: '',
            applicationID: '',
            size: '',
            content: {
                template: '',
                data: {
                    number: {
                        count: 0,
                        sub: {
                            value: 0,
                            dir: '', // "up" or "down"
                            item: '',
                            period: ''
                        }
                    }
                }
            },
            settings: {
                settingsPane: false,
                enabled: false,
                options: [{
                    title: 'ERROR',
                    value: 'Widget options not set'
                }]
            }
        }
    });

    Ghost.Collections.Widgets = Ghost.ProgressCollection.extend({
        // url: Ghost.paths.apiRoot + '/widgets/', // What will this be?
        model: Ghost.Models.Widget
    });

}());
