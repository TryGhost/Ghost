/*global window, document, Ghost, Backbone, $, _ */
(function () {
    "use strict";

    Ghost.Router = Backbone.Router.extend({

        routes: {
            ''                 : 'dashboard',
            'content/'         : 'blog',
            'settings/'        : 'settings',
            'settings(/:pane)' : 'settings',
            'editor/'          : 'editor',
            'editor(/:id)'     : 'editor',
            'debug/'           : 'debug',
            'register/'        : 'register',
            'signup/'          : 'signup',
            'login/'           : 'login'
        },

        signup: function () {
            Ghost.currentView = new Ghost.Views.Signup({ el: '.js-login-container' });
        },

        login: function () {
            Ghost.currentView = new Ghost.Views.Login({ el: '.js-login-container' });
        },

        blog: function () {
            var posts = new Ghost.Collections.Posts();
            posts.fetch({ data: { status: 'all', orderBy: ['updated_at', 'DESC'] } }).then(function () {
                Ghost.currentView = new Ghost.Views.Blog({ el: '#main', collection: posts });
            });
        },

        settings: function (pane) {
            var settings = new Ghost.Models.Settings();
            settings.fetch().then(function () {
                Ghost.currentView = new Ghost.Views.Settings({ el: '#main', model: settings, pane: pane });
            });
        },

        editor: function (id) {
            var post = new Ghost.Models.Post();
            post.urlRoot = Ghost.settings.apiRoot + '/posts';
            if (id) {
                post.id = id;
                post.fetch().then(function () {
                    Ghost.currentView = new Ghost.Views.Editor({ el: '#main', model: post });
                });
            } else {
                Ghost.currentView = new Ghost.Views.Editor({ el: '#main', model: post });
            }
        },

        debug: function () {
            Ghost.currentView = new Ghost.Views.Debug({ el: "#main" });
        },

        dashboard: function () {
            var widgets = new Ghost.Collections.Widgets();

            widgets.add({
                title: "LINZ, AUSTRIA",
                name: "time",
                author: "Matthew Harrison-Jones",
                applicationID: "com.ghost.time",
                content: {
                    template: 'custom/time',
                    data: {
                        day: "Today",
                        weather: "12",
                        time: "12:42PM",
                        date: "Monday / March 5 / 2013"
                    }
                },
                settings: {
                    settingsPane: true,
                    options: [{
                        title: "Timezone",
                        value: "GMT"
                    }]
                }
            });

            widgets.add({
                title: "Ghost",
                name: "image",
                author: "Matthew Harrison-Jones",
                applicationID: "com.ghost.image",
                size: "2x1",
                content: {
                    template: 'default/blank'
                },
                settings: {
                    settingsPane: true
                }
            });

            widgets.add({
                title: "Upcoming Posts",
                name: "posts",
                author: "Matthew Harrison-Jones",
                applicationID: "com.ghost.posts",
                content: {
                    template: 'custom/upcoming-posts',
                    data: {
                        ready: 9,
                        pending: 4,
                        draft: 1
                    }
                },
                settings: {
                    settingsPane: true
                }
            });

            widgets.add({
                title: "Unique Visitors (7 days)",
                name: "stats",
                author: "Matthew Harrison-Jones",
                applicationID: "com.ghost.stats",
                size: "2x2",
                content: {
                    template: 'default/number',
                    data: {
                        number: {
                            count: "293,051",
                            sub: {
                                value: "+14%",
                                dir: "up",
                                item: "",
                                period: "in the last 7 days"
                            }
                        }
                    }
                },
                settings: {
                    settingsPane: true
                }
            });

            widgets.add({
                title: "Facebook Likes",
                name: "facebook",
                author: "Matthew Harrison-Jones",
                applicationID: "com.ghost.facebook",
                content: {
                    template: 'default/number',
                    data: {
                        number: {
                            count: "12,329",
                            sub: {
                                value: "-3",
                                dir: "down",
                                item: "likes",
                                period: "today"
                            }
                        }
                    }
                },
                settings: {
                    settingsPane: true
                }
            });

            widgets.add({
                title: "Google Plus",
                name: "gplus",
                author: "Matthew Harrison-Jones",
                applicationID: "com.ghost.gplus",
                content: {
                    template: 'default/number',
                    data: {
                        number: {
                            count: "4,103",
                            sub: {
                                item: "have you in circles"
                            }
                        }
                    }
                },
                settings: {
                    settingsPane: true
                }
            });

            widgets.add({
                title: "Twitter",
                name: "twitter",
                author: "Matthew Harrison-Jones",
                applicationID: "com.ghost.twitter",
                content: {
                    template: 'default/blank'
                },
                settings: {
                    settingsPane: true,
                    enabled: true,
                    options: [
                        {
                            title: "Account",
                            value: "@JohnONolan"
                        },
                        {
                            title: "Display",
                            value: "Last Tweets"
                        },
                        {
                            title: "Quantity",
                            value: 6
                        }
                    ]
                }
            });

            widgets.add({
                title: "Campaign Monitor",
                name: "campaignmonitor",
                author: "Matthew Harrison-Jones",
                applicationID: "com.ghost.campaignmonitor",
                content: {
                    template: 'default/number',
                    data: {
                        number: {
                            count: "5,693",
                            sub: {
                                value: "+63",
                                dir: "up",
                                item: "subscribers",
                                period: "this week"
                            }
                        }
                    }
                },
                settings: {
                    settingsPane: true
                }
            });

            widgets.add({
                title: "Most Popular Posts",
                name: "popular",
                author: "Matthew Harrison-Jones",
                applicationID: "com.ghost.popular",
                size: "1x2",
                content: {
                    template: 'custom/popular-posts',
                    data: {
                        posts: [
                            {
                                title: "The Night of The Headless Horseman Part II",
                                time: "Yesterday",
                                count: "3,128"
                            },
                            {
                                title: "Latin Script & Why it's Particularly Boring to Read",
                                time: "Wednesday",
                                count: "1,345"
                            },
                            {
                                title: "59 Signs Your Cat and/or Dog Might be Planning To Kill You",
                                time: "Tuesday",
                                count: "824"
                            },
                            {
                                title: "A Love Letter to Emma Stone",
                                time: "Today",
                                count: "293"
                            },
                            {
                                title: "Lorem Ipsum Dolor Sit Amet & Other Funny Moments",
                                time: "Yesterday",
                                count: "124"
                            },
                            {
                                title: "Matt Does Git",
                                time: "Thursday",
                                count: "100"
                            }
                        ]
                    }
                }
            });

            widgets.add({
                title: "Posts This Week (Out Of 20)",
                name: "postsWeek",
                author: "Matthew Harrison-Jones",
                applicationID: "com.ghost.postsWeek",
                content: {
                    template: 'default/blank'
                }
            });

            widgets.add({
                title: "Your RSS News Feed",
                name: "rss",
                author: "Matthew Harrison-Jones",
                applicationID: "com.ghost.rss",
                size: "2x2",
                content: {
                    template: 'default/blank'
                },
                settings: {
                    settingsPane: true
                }
            });

            widgets.add({
                title: "Instagram",
                name: "instagram",
                author: "Matthew Harrison-Jones",
                applicationID: "com.ghost.instagram",
                content: {
                    template: 'custom/instagram',
                    data: {
                        image: "http://f.cl.ly/items/303f3y1n3I2L1F10343E/instagram.jpg"
                    }
                },
                settings: {
                    settingsPane: true,
                    options: [{
                        title: "Account",
                        value: "@JohnONolan"
                    }]
                }
            });

            widgets.add({
                title: "Klout",
                name: "klout",
                author: "Matthew Harrison-Jones",
                applicationID: "com.ghost.klout",
                content: {
                    template: 'default/number',
                    data: {
                        number: {
                            count: "64.23",
                            sub: {
                                value: "-0.42",
                                dir: "down",
                                item: "",
                                period: "in the last 30 days"
                            }
                        }
                    }
                },
                settings: {
                    settingsPane: true
                }
            });

            widgets.add({
                title: "Bounce Rate",
                name: "bounce",
                author: "Matthew Harrison-Jones",
                applicationID: "com.ghost.bounce",
                content: {
                    template: 'default/number',
                    data: {
                        number: {
                            count: "40.21%",
                            sub: {
                                value: "-2.53%",
                                dir: "up",
                                item: "",
                                period: "in the last month"
                            }
                        }
                    }
                },
                settings: {
                    settingsPane: true
                }
            });

            widgets.add({
                title: "Average Time On Site",
                name: "avgTime",
                author: "Matthew Harrison-Jones",
                applicationID: "com.ghost.avgTime",
                content: {
                    template: 'default/number',
                    data: {
                        number: {
                            count: "2m 16s",
                            sub: {
                                value: "+31.4%",
                                dir: "up",
                                item: "",
                                period: "in the last month"
                            }
                        }
                    }
                },
                settings: {
                    settingsPane: true
                }
            });

            widgets.add({
                title: "Last.fm",
                name: "lastfm",
                author: "Matthew Harrison-Jones",
                applicationID: "com.ghost.lastfm",
                content: {
                    template: 'custom/lastfm',
                    data: {
                        cover: "http://f.cl.ly/items/0p0r3T3v3M0R0H1k1p0S/imagine_dragons.png",
                        artist: "Imagine Dragons",
                        title: "On Top of The World"
                    }
                },
                settings: {
                    settingsPane: true
                }
            });

            widgets.add({
                title: "Post Ideas",
                name: "ideas",
                author: "Matthew Harrison-Jones",
                applicationID: "com.ghost.ideas",
                size: "2x1",
                content: {
                    template: 'custom/post-ideas'
                },
                settings: {
                    settingsPane: true
                }
            });

            widgets.add({
                title: "Twitter",
                name: "tweets",
                author: "Matthew Harrison-Jones",
                applicationID: "com.ghost.tweets",
                content: {
                    template: 'custom/tweets',
                    data: {
                        avatar: "http://f.cl.ly/items/1A1S0D3T3p1g1B2Z3J0u/ghost_twitter.jpeg",
                        name: "Ghost",
                        handle: "@TryGhost",
                        tweet: "If you're exploring the <a href='#'>@twitterapi</a>, be sure and bring the new field guide along. <a href='#'>dev.twitter.com/blog/...</a>",
                        time: "3 May 12"
                    }
                },
                settings: {
                    settingsPane: true
                }
            });

            widgets.add({
                title: "Backups",
                name: "backups",
                author: "Matthew Harrison-Jones",
                applicationID: "com.ghost.backups",
                content: {
                    template: 'default/blank'
                },
                settings: {
                    settingsPane: true
                }
            });

            //widgets.fetch().then(function () {
            Ghost.currentView = new Ghost.Views.Dashboard({ el: '#main', collection: widgets });
            //});
        }
    });
}());
