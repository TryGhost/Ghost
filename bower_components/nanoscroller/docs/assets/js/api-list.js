YUI.add('api-list', function (Y) {

var Lang   = Y.Lang,
    YArray = Y.Array,

    APIList = Y.namespace('APIList'),

    classesNode    = Y.one('#api-classes'),
    inputNode      = Y.one('#api-filter'),
    modulesNode    = Y.one('#api-modules'),
    tabviewNode    = Y.one('#api-tabview'),

    tabs = APIList.tabs = {},

    filter = APIList.filter = new Y.APIFilter({
        inputNode : inputNode,
        maxResults: 1000,

        on: {
            results: onFilterResults
        }
    }),

    search = APIList.search = new Y.APISearch({
        inputNode : inputNode,
        maxResults: 100,

        on: {
            clear  : onSearchClear,
            results: onSearchResults
        }
    }),

    tabview = APIList.tabview = new Y.TabView({
        srcNode  : tabviewNode,
        panelNode: '#api-tabview-panel',
        render   : true,

        on: {
            selectionChange: onTabSelectionChange
        }
    }),

    focusManager = APIList.focusManager = tabviewNode.plug(Y.Plugin.NodeFocusManager, {
        circular   : true,
        descendants: '#api-filter, .yui3-tab-panel-selected .api-list-item a, .yui3-tab-panel-selected .result a',
        keys       : {next: 'down:40', previous: 'down:38'}
    }).focusManager,

    LIST_ITEM_TEMPLATE =
        '<li class="api-list-item {typeSingular}">' +
            '<a href="{rootPath}{typePlural}/{name}.html">{displayName}</a>' +
        '</li>';

// -- Init ---------------------------------------------------------------------

// Duckpunch FocusManager's key event handling to prevent it from handling key
// events when a modifier is pressed.
Y.before(function (e, activeDescendant) {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) {
        return new Y.Do.Prevent();
    }
}, focusManager, '_focusPrevious', focusManager);

Y.before(function (e, activeDescendant) {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) {
        return new Y.Do.Prevent();
    }
}, focusManager, '_focusNext', focusManager);

// Create a mapping of tabs in the tabview so we can refer to them easily later.
tabview.each(function (tab, index) {
    var name = tab.get('label').toLowerCase();

    tabs[name] = {
        index: index,
        name : name,
        tab  : tab
    };
});

// Switch tabs on Ctrl/Cmd-Left/Right arrows.
tabviewNode.on('key', onTabSwitchKey, 'down:37,39');

// Focus the filter input when the `/` key is pressed.
Y.one(Y.config.doc).on('key', onSearchKey, 'down:83');

// Keep the Focus Manager up to date.
inputNode.on('focus', function () {
    focusManager.set('activeDescendant', inputNode);
});

// Update all tabview links to resolved URLs.
tabview.get('panelNode').all('a').each(function (link) {
    link.setAttribute('href', link.get('href'));
});

// -- Private Functions --------------------------------------------------------
function getFilterResultNode() {
    return filter.get('queryType') === 'classes' ? classesNode : modulesNode;
}

// -- Event Handlers -----------------------------------------------------------
function onFilterResults(e) {
    var frag         = Y.one(Y.config.doc.createDocumentFragment()),
        resultNode   = getFilterResultNode(),
        typePlural   = filter.get('queryType'),
        typeSingular = typePlural === 'classes' ? 'class' : 'module';

    if (e.results.length) {
        YArray.each(e.results, function (result) {
            frag.append(Lang.sub(LIST_ITEM_TEMPLATE, {
                rootPath    : APIList.rootPath,
                displayName : filter.getDisplayName(result.highlighted),
                name        : result.text,
                typePlural  : typePlural,
                typeSingular: typeSingular
            }));
        });
    } else {
        frag.append(
            '<li class="message">' +
                'No ' + typePlural + ' found.' +
            '</li>'
        );
    }

    resultNode.empty(true);
    resultNode.append(frag);

    focusManager.refresh();
}

function onSearchClear(e) {

    focusManager.refresh();
}

function onSearchKey(e) {
    var target = e.target;

    if (target.test('input,select,textarea')
            || target.get('isContentEditable')) {
        return;
    }

    e.preventDefault();

    inputNode.focus();
    focusManager.refresh();
}

function onSearchResults(e) {
    var frag = Y.one(Y.config.doc.createDocumentFragment());

    if (e.results.length) {
        YArray.each(e.results, function (result) {
            frag.append(result.display);
        });
    } else {
        frag.append(
            '<li class="message">' +
                'No results found. Maybe you\'ll have better luck with a ' +
                'different query?' +
            '</li>'
        );
    }


    focusManager.refresh();
}

function onTabSelectionChange(e) {
    var tab  = e.newVal,
        name = tab.get('label').toLowerCase();

    tabs.selected = {
        index: tab.get('index'),
        name : name,
        tab  : tab
    };

    switch (name) {
    case 'classes': // fallthru
    case 'modules':
        filter.setAttrs({
            minQueryLength: 0,
            queryType     : name
        });

        search.set('minQueryLength', -1);

        // Only send a request if this isn't the initially-selected tab.
        if (e.prevVal) {
            filter.sendRequest(filter.get('value'));
        }
        break;

    case 'everything':
        filter.set('minQueryLength', -1);
        search.set('minQueryLength', 1);

        if (search.get('value')) {
            search.sendRequest(search.get('value'));
        } else {
            inputNode.focus();
        }
        break;

    default:
        // WTF? We shouldn't be here!
        filter.set('minQueryLength', -1);
        search.set('minQueryLength', -1);
    }

    if (focusManager) {
        setTimeout(function () {
            focusManager.refresh();
        }, 1);
    }
}

function onTabSwitchKey(e) {
    var currentTabIndex = tabs.selected.index;

    if (!(e.ctrlKey || e.metaKey)) {
        return;
    }

    e.preventDefault();

    switch (e.keyCode) {
    case 37: // left arrow
        if (currentTabIndex > 0) {
            tabview.selectChild(currentTabIndex - 1);
            inputNode.focus();
        }
        break;

    case 39: // right arrow
        if (currentTabIndex < (Y.Object.size(tabs) - 2)) {
            tabview.selectChild(currentTabIndex + 1);
            inputNode.focus();
        }
        break;
    }
}

}, '3.4.0', {requires: [
    'api-filter', 'api-search', 'event-key', 'node-focusmanager', 'tabview'
]});
