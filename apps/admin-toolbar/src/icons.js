import {createElement as h} from 'preact';

const icons = {
    analytics: [
        h('path', {d: 'M4 19V5'}),
        h('path', {d: 'M4 19h16'}),
        h('path', {d: 'M8 16v-5'}),
        h('path', {d: 'M12 16V8'}),
        h('path', {d: 'M16 16v-3'})
    ],
    comments: [
        h('path', {d: 'M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z'})
    ],
    edit: [
        h('path', {d: 'M12 20h9'}),
        h('path', {d: 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z'})
    ],
    members: [
        h('path', {d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'}),
        h('path', {d: 'M16 3.128a4 4 0 0 1 0 7.744'}),
        h('path', {d: 'M22 21v-2a4 4 0 0 0-3-3.87'}),
        h('circle', {cx: '9', cy: '7', r: '4'})
    ],
    network: [
        h('circle', {cx: '5', cy: '19', r: '2'}),
        h('circle', {cx: '19', cy: '5', r: '2'}),
        h('circle', {cx: '12', cy: '12', r: '4'}),
        h('path', {d: 'M8.8 21.5a10 10 0 0 0 12.7-12.7'}),
        h('path', {d: 'M2.5 15.2A10 10 0 0 1 15.2 2.5'})
    ],
    posts: [
        h('path', {d: 'M13 21h8'}),
        h('path', {d: 'M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z'})
    ],
    siteAnalytics: [
        h('path', {d: 'M16 7h6v6'}),
        h('path', {d: 'm22 7-8.5 8.5-5-5L2 17'})
    ],
    settings: [
        h('path', {d: 'M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915'}),
        h('circle', {cx: '12', cy: '12', r: '3'})
    ],
    more: [
        h('circle', {cx: '12', cy: '5', r: '1'}),
        h('circle', {cx: '12', cy: '12', r: '1'}),
        h('circle', {cx: '12', cy: '19', r: '1'})
    ],
    moreHorizontal: [
        h('circle', {cx: '5', cy: '12', r: '1'}),
        h('circle', {cx: '12', cy: '12', r: '1'}),
        h('circle', {cx: '19', cy: '12', r: '1'})
    ]
};

export function Icon({name}) {
    return h('svg', {
        'aria-hidden': 'true',
        className: `gh-admin-toolbar-icon gh-admin-toolbar-icon-${name}`,
        fill: 'none',
        height: '20',
        stroke: 'currentColor',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'stroke-width': '2',
        viewBox: '0 0 24 24',
        width: '20'
    }, icons[name]);
}
