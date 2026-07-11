import {createElement as h} from 'preact';
import {useEffect, useLayoutEffect, useRef, useState} from 'preact/hooks';

import {getToolbarActions} from './actions';
import {DISPLAY_EXPANDED, DISPLAY_MINIMIZED, ROOT_ID} from './constants';
import {Icon} from './icons';
import {adminHref, hideToolbarHref} from './links';
import {getStoredDisplayState, setStoredDisplayState} from './storage';
import {getUserImage, getUserLabel} from './user';

function ScreenReaderLabel({children}) {
    return h('span', {className: 'gh-admin-toolbar-sr-only'}, children);
}

function TooltipWrap({children, label}) {
    return h('span', {className: 'gh-admin-toolbar-tooltip-wrap'}, [
        children,
        h('span', {
            className: 'gh-admin-toolbar-tooltip',
            role: 'tooltip'
        }, label)
    ]);
}

function ToolbarLink({href, icon, label}) {
    const link = h('a', {
        className: 'gh-admin-toolbar-link',
        href,
        'aria-label': label
    }, [
        h(Icon, {name: icon}),
        h(ScreenReaderLabel, null, label)
    ]);

    return h(TooltipWrap, {label}, link);
}

function ToolbarMenu({isMinimized, isOpen, onMaximize, onMinimize, setIsOpen}) {
    const label = 'More';
    const button = h('button', {
        type: 'button',
        className: 'gh-admin-toolbar-button',
        'aria-expanded': isOpen ? 'true' : 'false',
        'aria-haspopup': 'menu',
        'aria-label': label,
        onClick: () => {
            setIsOpen(!isOpen);
        },
        onKeyDown: (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        }
    }, [
        h(Icon, {name: 'more'}),
        h(ScreenReaderLabel, null, label)
    ]);

    return h('div', {
        className: 'gh-admin-toolbar-menu-wrap',
        onFocusOut: (event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
                setIsOpen(false);
            }
        }
    }, [
        h(TooltipWrap, {label}, button),
        isOpen ? h('div', {
            className: 'gh-admin-toolbar-menu'
        }, [
            h('button', {
                type: 'button',
                className: 'gh-admin-toolbar-menu-item',
                onClick: isMinimized ? onMaximize : onMinimize
            }, isMinimized ? 'Maximize' : 'Minimize'),
            h('a', {
                className: 'gh-admin-toolbar-menu-item',
                href: hideToolbarHref()
            }, 'Hide toolbar')
        ]) : null
    ]);
}

function UserAvatar({adminUrl, siteTitle, user}) {
    const userLabel = getUserLabel(user);
    const userImage = getUserImage(user);

    const link = h('a', {
        className: 'gh-admin-toolbar-user',
        href: adminHref(adminUrl, ''),
        'aria-label': `Open Ghost Admin for ${userLabel} on ${siteTitle}`
    }, [
        h('span', {className: 'gh-admin-toolbar-avatar', 'aria-hidden': 'true'}, [
            h('span', {className: 'gh-admin-toolbar-avatar-fallback'}, userLabel.slice(0, 1).toUpperCase()),
            userImage ? h('img', {
                alt: '',
                className: 'gh-admin-toolbar-avatar-image',
                loading: 'lazy',
                onError: (event) => {
                    event.currentTarget.remove();
                },
                referrerPolicy: 'no-referrer',
                src: userImage
            }) : null
        ]),
        h(ScreenReaderLabel, null, 'Admin')
    ]);

    return h(TooltipWrap, {label: 'Admin'}, link);
}

export function Toolbar({config, user}) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => getStoredDisplayState() === DISPLAY_MINIMIZED);
    const [isMinimizedExpanded, setIsMinimizedExpanded] = useState(false);
    const [expandedSize, setExpandedSize] = useState(null);
    const toolbarRef = useRef(null);
    const contentRef = useRef(null);
    const actions = getToolbarActions(config);

    function expandMinimizedToolbar() {
        setIsMinimizedExpanded(true);
    }

    function collapseMinimizedToolbar() {
        if (isMenuOpen) {
            return;
        }

        setIsMenuOpen(false);
        setIsMinimizedExpanded(false);
    }

    useLayoutEffect(() => {
        if (!toolbarRef.current || !contentRef.current) {
            return;
        }

        if (isMinimized) {
            setExpandedSize({
                height: Math.max(contentRef.current.scrollHeight + 12, 44),
                width: contentRef.current.scrollWidth + 8
            });
            return;
        }

        const toolbarRect = toolbarRef.current.getBoundingClientRect();
        setExpandedSize({
            height: toolbarRect.height,
            width: toolbarRect.width
        });
    }, [isMinimized, actions.length]);

    useEffect(() => {
        const host = document.getElementById(ROOT_ID);

        if (!host) {
            return;
        }

        host.classList.toggle('gh-admin-toolbar-menu-open', isMenuOpen);
        host.classList.toggle('gh-admin-toolbar-is-minimized', isMinimized && !isMinimizedExpanded);

        return () => {
            host.classList.remove('gh-admin-toolbar-menu-open');
            host.classList.remove('gh-admin-toolbar-is-minimized');
        };
    }, [isMenuOpen, isMinimized, isMinimizedExpanded]);

    return h('nav', {
        className: `gh-admin-toolbar${isMinimized ? ' gh-admin-toolbar-minimized-mode' : ''}${isMinimizedExpanded ? ' gh-admin-toolbar-minimized-expanded' : ''}`,
        onFocusOut: (event) => {
            if (isMinimized && !event.currentTarget.contains(event.relatedTarget)) {
                collapseMinimizedToolbar();
            }
        },
        onMouseLeave: () => {
            collapseMinimizedToolbar();
        },
        onMouseEnter: () => {
            if (isMinimized) {
                expandMinimizedToolbar();
            }
        },
        onMouseOver: () => {
            if (isMinimized) {
                expandMinimizedToolbar();
            }
        },
        onPointerEnter: () => {
            if (isMinimized) {
                expandMinimizedToolbar();
            }
        },
        ref: toolbarRef,
        role: 'navigation',
        style: isMinimized ? {
            '--gh-admin-toolbar-expanded-height': `${expandedSize?.height || 44}px`,
            '--gh-admin-toolbar-expanded-width': `${expandedSize?.width || 178}px`
        } : null,
        'aria-label': 'Ghost admin toolbar'
    }, [
        h('button', {
            type: 'button',
            className: 'gh-admin-toolbar-minimized-pill',
            'aria-label': 'Show admin toolbar',
            onClick: expandMinimizedToolbar
        }, [
            h(Icon, {name: 'moreHorizontal'}),
            h(ScreenReaderLabel, null, 'Show admin toolbar')
        ]),
        h('div', {className: 'gh-admin-toolbar-section', ref: contentRef}, [
            h(UserAvatar, {adminUrl: config.adminUrl, siteTitle: config.siteTitle, user}),
            ...actions.map(action => h(ToolbarLink, action)),
            h(ToolbarMenu, {
                isMinimized,
                isOpen: isMenuOpen,
                onMaximize: () => {
                    setStoredDisplayState(DISPLAY_EXPANDED);
                    setIsMenuOpen(false);
                    setIsMinimized(false);
                    setIsMinimizedExpanded(false);
                },
                onMinimize: () => {
                    setStoredDisplayState(DISPLAY_MINIMIZED);
                    setIsMenuOpen(false);
                    setIsMinimized(true);
                    setIsMinimizedExpanded(false);
                },
                setIsOpen: setIsMenuOpen
            })
        ])
    ]);
}
