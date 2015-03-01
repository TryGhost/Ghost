YUI().use(
    'yuidoc-meta',
    'api-list', 'history-hash', 'node-screen', 'node-style', 'pjax',
function (Y) {

var win          = Y.config.win,
    localStorage = win.localStorage,

    bdNode = Y.one('#bd'),

    pjax,
    defaultRoute,

    classTabView,
    selectedTab;

// Kill pjax functionality unless serving over HTTP.
if (!Y.getLocation().protocol.match(/^https?\:/)) {
    Y.Router.html5 = false;
}

// Create the default route with middleware which enables syntax highlighting
// on the loaded content.
defaultRoute = Y.Pjax.defaultRoute.concat(function (req, res, next) {
    prettyPrint();
    bdNode.removeClass('loading');

    next();
});

pjax = new Y.Pjax({
    container      : '#docs-main',
    contentSelector: '#docs-main > .content',
    linkSelector   : '#bd a',
    titleSelector  : '#xhr-title',

    navigateOnHash: true,
    root          : '/',
    routes        : [
        // -- / ----------------------------------------------------------------
        {
            path     : '/(index.html)?',
            callbacks: defaultRoute
        },

        // -- /classes/* -------------------------------------------------------
        {
            path     : '/classes/:class.html*',
            callbacks: [defaultRoute, 'handleClasses']
        },

        // -- /files/* ---------------------------------------------------------
        {
            path     : '/files/*file',
            callbacks: [defaultRoute, 'handleFiles']
        },

        // -- /modules/* -------------------------------------------------------
        {
            path     : '/modules/:module.html*',
            callbacks: defaultRoute
        }
    ]
});

// -- Utility Functions --------------------------------------------------------

pjax.checkVisibility = function (tab) {
    tab || (tab = selectedTab);

    if (!tab) { return; }

    var panelNode = tab.get('panelNode'),
        visibleItems;

    // If no items are visible in the tab panel due to the current visibility
    // settings, display a message to that effect.
    visibleItems = panelNode.all('.item,.index-item').some(function (itemNode) {
        if (itemNode.getComputedStyle('display') !== 'none') {
            return true;
        }
    });

    panelNode.all('.no-visible-items').remove();

    if (!visibleItems) {
        if (Y.one('#index .index-item')) {
            panelNode.append(
                '<div class="no-visible-items">' +
                    '<p>' +
                    'Some items are not shown due to the current visibility ' +
                    'settings. Use the checkboxes at the upper right of this ' +
                    'page to change the visibility settings.' +
                    '</p>' +
                '</div>'
            );
        } else {
            panelNode.append(
                '<div class="no-visible-items">' +
                    '<p>' +
                    'This class doesn\'t provide any methods, properties, ' +
                    'attributes, or events.' +
                    '</p>' +
                '</div>'
            );
        }
    }

    // Hide index sections without any visible items.
    Y.all('.index-section').each(function (section) {
        var items        = 0,
            visibleItems = 0;

        section.all('.index-item').each(function (itemNode) {
            items += 1;

            if (itemNode.getComputedStyle('display') !== 'none') {
                visibleItems += 1;
            }
        });

        section.toggleClass('hidden', !visibleItems);
        section.toggleClass('no-columns', visibleItems < 4);
    });
};

pjax.initClassTabView = function () {
    if (!Y.all('#classdocs .api-class-tab').size()) {
        return;
    }

    if (classTabView) {
        classTabView.destroy();
        selectedTab = null;
    }

    classTabView = new Y.TabView({
        srcNode: '#classdocs',

        on: {
            selectionChange: pjax.onTabSelectionChange
        }
    });

    pjax.updateTabState();
    classTabView.render();
};

pjax.initLineNumbers = function () {
    var hash      = win.location.hash.substring(1),
        container = pjax.get('container'),
        hasLines, node;

    // Add ids for each line number in the file source view.
    container.all('.linenums>li').each(function (lineNode, index) {
        lineNode.set('id', 'l' + (index + 1));
        lineNode.addClass('file-line');
        hasLines = true;
    });

    // Scroll to the desired line.
    if (hasLines && /^l\d+$/.test(hash)) {
        if ((node = container.getById(hash))) {
            win.scroll(0, node.getY());
        }
    }
};

pjax.initRoot = function () {
    var terminators = /^(?:classes|files|modules)$/,
        parts       = pjax._getPathRoot().split('/'),
        root        = [],
        i, len, part;

    for (i = 0, len = parts.length; i < len; i += 1) {
        part = parts[i];

        if (part.match(terminators)) {
            // Makes sure the path will end with a "/".
            root.push('');
            break;
        }

        root.push(part);
    }

    pjax.set('root', root.join('/'));
};

pjax.updateTabState = function (src) {
    var hash = win.location.hash.substring(1),
        defaultTab, node, tab, tabPanel;

    function scrollToNode() {
        if (node.hasClass('protected')) {
            Y.one('#api-show-protected').set('checked', true);
            pjax.updateVisibility();
        }

        if (node.hasClass('private')) {
            Y.one('#api-show-private').set('checked', true);
            pjax.updateVisibility();
        }

        setTimeout(function () {
            // For some reason, unless we re-get the node instance here,
            // getY() always returns 0.
            var node = Y.one('#classdocs').getById(hash);
            win.scrollTo(0, node.getY() - 70);
        }, 1);
    }

    if (!classTabView) {
        return;
    }

    if (src === 'hashchange' && !hash) {
        defaultTab = 'index';
    } else {
        if (localStorage) {
            defaultTab = localStorage.getItem('tab_' + pjax.getPath()) ||
                'index';
        } else {
            defaultTab = 'index';
        }
    }

    if (hash && (node = Y.one('#classdocs').getById(hash))) {
        if ((tabPanel = node.ancestor('.api-class-tabpanel', true))) {
            if ((tab = Y.one('#classdocs .api-class-tab.' + tabPanel.get('id')))) {
                if (classTabView.get('rendered')) {
                    Y.Widget.getByNode(tab).set('selected', 1);
                } else {
                    tab.addClass('yui3-tab-selected');
                }
            }
        }

        // Scroll to the desired element if this is a hash URL.
        if (node) {
            if (classTabView.get('rendered')) {
                scrollToNode();
            } else {
                classTabView.once('renderedChange', scrollToNode);
            }
        }
    } else {
        tab = Y.one('#classdocs .api-class-tab.' + defaultTab);

        // When the `defaultTab` node isn't found, `localStorage` is stale.
        if (!tab && defaultTab !== 'index') {
            tab = Y.one('#classdocs .api-class-tab.index');
        }

        if (classTabView.get('rendered')) {
            Y.Widget.getByNode(tab).set('selected', 1);
        } else {
            tab.addClass('yui3-tab-selected');
        }
    }
};

pjax.updateVisibility = function () {
    var container = pjax.get('container');

    container.toggleClass('hide-inherited',
            !Y.one('#api-show-inherited').get('checked'));

    container.toggleClass('show-deprecated',
            Y.one('#api-show-deprecated').get('checked'));

    container.toggleClass('show-protected',
            Y.one('#api-show-protected').get('checked'));

    container.toggleClass('show-private',
            Y.one('#api-show-private').get('checked'));

    pjax.checkVisibility();
};

// -- Route Handlers -----------------------------------------------------------

pjax.handleClasses = function (req, res, next) {
    var status = res.ioResponse.status;

    // Handles success and local filesystem XHRs.
    if (res.ioResponse.readyState === 4 && (!status || (status >= 200 && status < 300))) {
        pjax.initClassTabView();
    }

    next();
};

pjax.handleFiles = function (req, res, next) {
    var status = res.ioResponse.status;

    // Handles success and local filesystem XHRs.
    if (res.ioResponse.readyState === 4 && (!status || (status >= 200 && status < 300))) {
        pjax.initLineNumbers();
    }

    next();
};

// -- Event Handlers -----------------------------------------------------------

pjax.onNavigate = function (e) {
    var hash         = e.hash,
        originTarget = e.originEvent && e.originEvent.target,
        tab;

    if (hash) {
        tab = originTarget && originTarget.ancestor('.yui3-tab', true);

        if (hash === win.location.hash) {
            pjax.updateTabState('hashchange');
        } else if (!tab) {
            win.location.hash = hash;
        }

        e.preventDefault();
        return;
    }

    // Only scroll to the top of the page when the URL doesn't have a hash.
    this.set('scrollToTop', !e.url.match(/#.+$/));

    bdNode.addClass('loading');
};

pjax.onOptionClick = function (e) {
    pjax.updateVisibility();
};

pjax.onTabSelectionChange = function (e) {
    var tab   = e.newVal,
        tabId = tab.get('contentBox').getAttribute('href').substring(1);

    selectedTab = tab;

    // If switching from a previous tab (i.e., this is not the default tab),
    // replace the history entry with a hash URL that will cause this tab to
    // be selected if the user navigates away and then returns using the back
    // or forward buttons.
    if (e.prevVal && localStorage) {
        localStorage.setItem('tab_' + pjax.getPath(), tabId);
    }

    pjax.checkVisibility(tab);
};

// -- Init ---------------------------------------------------------------------

pjax.on('navigate', pjax.onNavigate);

pjax.initRoot();
pjax.upgrade();
pjax.initClassTabView();
pjax.initLineNumbers();
pjax.updateVisibility();

Y.APIList.rootPath = pjax.get('root');

Y.one('#api-options').delegate('click', pjax.onOptionClick, 'input');

Y.on('hashchange', function (e) {
    pjax.updateTabState('hashchange');
}, win);

});
