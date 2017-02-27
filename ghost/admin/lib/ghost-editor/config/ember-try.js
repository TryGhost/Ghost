/*jshint node:true*/
module.exports = {
    scenarios: [
        {
            name: 'default',
            bower: {
                dependencies: {}
            }
        },
        {
            name: 'ember-1.13',
            bower: {
                dependencies: {
                    'ember': '~1.13.0'
                },
                resolutions: {
                    'ember': '~1.13.0'
                }
            }
        },
        {
            name: 'ember-release',
            bower: {
                dependencies: {
                    'ember': 'components/ember#release'
                },
                resolutions: {
                    'ember': 'release'
                }
            }
        },
        {
            name: 'ember-beta',
            bower: {
                dependencies: {
                    'ember': 'components/ember#beta'
                },
                resolutions: {
                    'ember': 'beta'
                }
            }
        },
        {
            name: 'ember-canary',
            bower: {
                dependencies: {
                    'ember': 'components/ember#canary'
                },
                resolutions: {
                    'ember': 'canary'
                }
            }
        }
    ]
};
