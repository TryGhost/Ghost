export function getToolbarStyle() {
    return `
        :host {
            all: initial;
            color-scheme: light;
            font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            font-size: 14px;
            line-height: 1.4;
        }

        .gh-admin-toolbar {
            align-items: center;
            background: #fff;
            border: 1px solid #dce0e6;
            border-radius: 999px;
            bottom: calc(16px + env(safe-area-inset-bottom, 0px));
            box-sizing: border-box;
            box-shadow: 0 16px 40px rgba(15, 23, 42, 0.14), 0 2px 8px rgba(15, 23, 42, 0.08);
            color: #050505;
            display: flex;
            gap: 6px;
            left: 50%;
            min-height: 44px;
            overflow: visible;
            padding: 5px 7px;
            position: fixed;
            transform: translateX(-50%);
            transition: width 180ms cubic-bezier(0.16, 1, 0.3, 1), height 180ms cubic-bezier(0.16, 1, 0.3, 1), min-height 180ms cubic-bezier(0.16, 1, 0.3, 1), padding 180ms cubic-bezier(0.16, 1, 0.3, 1), transform 180ms cubic-bezier(0.16, 1, 0.3, 1);
            z-index: 2147483647;
        }

        .gh-admin-toolbar-minimized-mode {
            height: 18px;
            min-height: 0;
            overflow: hidden;
            padding: 1px;
            width: 32px;
        }

        .gh-admin-toolbar-minimized-mode.gh-admin-toolbar-minimized-expanded {
            height: var(--gh-admin-toolbar-expanded-height);
            min-height: var(--gh-admin-toolbar-expanded-height);
            overflow: visible;
            padding: 5px 7px;
            width: var(--gh-admin-toolbar-expanded-width);
        }

        .gh-admin-toolbar-minimized-pill {
            align-items: center;
            appearance: none;
            background: transparent;
            border: 0;
            border-radius: 999px;
            box-sizing: border-box;
            color: #0a0a0a;
            cursor: pointer;
            display: inline-flex;
            height: 12px;
            justify-content: center;
            left: 50%;
            opacity: 0;
            padding: 0;
            pointer-events: none;
            position: absolute;
            top: 50%;
            transform: translate(-50%, -50%);
            transition: background 120ms ease, color 120ms ease, opacity 110ms ease;
            width: 28px;
        }

        .gh-admin-toolbar-minimized-mode .gh-admin-toolbar-minimized-pill {
            opacity: 1;
            pointer-events: auto;
            transition-delay: 80ms;
        }

        .gh-admin-toolbar-minimized-mode.gh-admin-toolbar-minimized-expanded .gh-admin-toolbar-minimized-pill {
            opacity: 0;
            pointer-events: none;
            transition-delay: 0ms;
        }

        .gh-admin-toolbar-minimized-pill:hover {
            background: #f2f4f7;
            color: #15171a;
        }

        .gh-admin-toolbar-minimized-pill:focus-visible {
            outline: 2px solid #15171a;
            outline-offset: 3px;
        }

        .gh-admin-toolbar-section {
            align-items: center;
            display: flex;
            flex: 0 0 auto;
            gap: 4px;
            min-width: 0;
            opacity: 1;
            transform: scale(1);
            transition: opacity 120ms ease, transform 180ms cubic-bezier(0.16, 1, 0.3, 1);
            white-space: nowrap;
        }

        .gh-admin-toolbar-minimized-mode .gh-admin-toolbar-section {
            opacity: 0;
            pointer-events: none;
            transform: scale(0.92);
        }

        .gh-admin-toolbar-minimized-mode.gh-admin-toolbar-minimized-expanded .gh-admin-toolbar-section {
            opacity: 1;
            pointer-events: auto;
            transform: scale(1);
            transition-delay: 60ms;
        }

        .gh-admin-toolbar-link,
        .gh-admin-toolbar-button {
            align-items: center;
            appearance: none;
            background: transparent;
            border: 0;
            border-radius: 999px;
            box-sizing: border-box;
            color: #0a0a0a;
            cursor: pointer;
            display: inline-flex;
            flex: 0 0 auto;
            font: inherit;
            justify-content: center;
            height: 32px;
            padding: 0;
            text-decoration: none;
            transition: background 120ms ease, color 120ms ease, transform 120ms ease;
            width: 32px;
        }

        .gh-admin-toolbar-link:hover,
        .gh-admin-toolbar-button:hover {
            background: #f2f4f7;
            color: #15171a;
        }

        .gh-admin-toolbar-link:focus-visible,
        .gh-admin-toolbar-button:focus-visible {
            outline: 2px solid #15171a;
            outline-offset: 3px;
        }

        .gh-admin-toolbar-tooltip-wrap {
            display: inline-flex;
            position: relative;
        }

        .gh-admin-toolbar-tooltip {
            background: #15171a;
            border-radius: 6px;
            bottom: calc(100% + 8px);
            box-shadow: 0 10px 26px rgba(15, 23, 42, 0.18), 0 1px 4px rgba(15, 23, 42, 0.12);
            box-sizing: border-box;
            color: #fff;
            font-size: 12px;
            font-weight: 600;
            left: 50%;
            line-height: 1;
            max-width: 220px;
            opacity: 0;
            padding: 7px 8px;
            pointer-events: none;
            position: absolute;
            transform: translateX(-50%) translateY(2px);
            transition: opacity 120ms ease, transform 120ms ease;
            white-space: nowrap;
            z-index: 2147483647;
        }

        .gh-admin-toolbar-tooltip-wrap:hover .gh-admin-toolbar-tooltip,
        .gh-admin-toolbar-tooltip-wrap:has(:focus-visible) .gh-admin-toolbar-tooltip {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }

        :host(.gh-admin-toolbar-menu-open) .gh-admin-toolbar-tooltip {
            opacity: 0;
        }

        .gh-admin-toolbar-menu-wrap {
            display: inline-flex;
            position: relative;
        }

        .gh-admin-toolbar-menu {
            background: #fff;
            border: 1px solid #dce0e6;
            border-radius: 10px;
            bottom: calc(100% + 10px);
            box-shadow: 0 14px 34px rgba(15, 23, 42, 0.16), 0 2px 8px rgba(15, 23, 42, 0.08);
            box-sizing: border-box;
            left: 50%;
            min-width: 112px;
            padding: 4px;
            position: absolute;
            transform: translateX(-50%);
            z-index: 2147483647;
        }

        .gh-admin-toolbar-menu-item {
            align-items: center;
            border-radius: 7px;
            box-sizing: border-box;
            color: #15171a;
            display: flex;
            font-family: inherit;
            font-size: 13px;
            font-weight: 600;
            line-height: 1;
            padding: 9px 10px;
            text-decoration: none;
            white-space: nowrap;
        }

        .gh-admin-toolbar-menu-item:hover {
            background: #f2f4f7;
        }

        button.gh-admin-toolbar-menu-item {
            appearance: none;
            background: transparent;
            border: 0;
            cursor: pointer;
            text-align: left;
            width: 100%;
        }

        .gh-admin-toolbar-menu-item:focus-visible {
            outline: 2px solid #15171a;
            outline-offset: 2px;
        }

        .gh-admin-toolbar-icon {
            flex: 0 0 auto;
            height: 17px;
            width: 17px;
        }

        .gh-admin-toolbar-icon-siteAnalytics,
        .gh-admin-toolbar-icon-network,
        .gh-admin-toolbar-icon-posts,
        .gh-admin-toolbar-icon-members,
        .gh-admin-toolbar-icon-settings {
            transform: scale(0.9);
            transform-origin: center;
        }

        .gh-admin-toolbar-icon-settings {
            transform: scale(0.96);
        }

        .gh-admin-toolbar-icon-moreHorizontal {
            height: 18px;
            width: 18px;
        }

        .gh-admin-toolbar-user {
            align-items: center;
            background: #f6f7f9;
            border-radius: 999px;
            color: #111;
            display: inline-flex;
            flex: 0 0 auto;
            height: 32px;
            justify-content: center;
            overflow: hidden;
            text-decoration: none;
            width: 32px;
        }

        .gh-admin-toolbar-user:hover {
            background: #eef1f5;
        }

        .gh-admin-toolbar-user:focus-visible {
            outline: 2px solid #15171a;
            outline-offset: 3px;
        }

        .gh-admin-toolbar-avatar {
            align-items: center;
            background: #15171a;
            border-radius: 999px;
            color: #fff;
            display: inline-flex;
            font-size: 11px;
            font-weight: 700;
            height: 24px;
            justify-content: center;
            line-height: 1;
            overflow: hidden;
            position: relative;
            width: 24px;
        }

        .gh-admin-toolbar-avatar-fallback {
            align-items: center;
            display: inline-flex;
            height: 100%;
            justify-content: center;
            width: 100%;
        }

        .gh-admin-toolbar-avatar-image {
            display: block;
            height: 100%;
            inset: 0;
            object-fit: cover;
            position: absolute;
            width: 100%;
        }

        .gh-admin-toolbar-sr-only {
            border: 0;
            clip: rect(0 0 0 0);
            clip-path: inset(50%);
            height: 1px;
            margin: -1px;
            overflow: hidden;
            padding: 0;
            position: absolute;
            white-space: nowrap;
            width: 1px;
        }

        @media (max-width: 700px) {
            .gh-admin-toolbar {
                max-width: calc(100vw - 24px);
                overflow-x: auto;
                padding: 6px;
                scrollbar-width: none;
            }

            .gh-admin-toolbar-minimized-mode {
                height: 18px;
                min-height: 0;
                overflow: hidden;
                padding: 1px;
                width: 32px;
            }

            .gh-admin-toolbar-minimized-mode.gh-admin-toolbar-minimized-expanded {
                height: var(--gh-admin-toolbar-expanded-height);
                min-height: var(--gh-admin-toolbar-expanded-height);
                overflow: visible;
                padding: 5px 7px;
                width: var(--gh-admin-toolbar-expanded-width);
            }

            .gh-admin-toolbar::-webkit-scrollbar {
                display: none;
            }

            .gh-admin-toolbar-link,
            .gh-admin-toolbar-button,
            .gh-admin-toolbar-user {
                height: 32px;
                width: 32px;
            }
        }

        @media (prefers-reduced-motion: reduce) {
            .gh-admin-toolbar,
            .gh-admin-toolbar-section,
            .gh-admin-toolbar-minimized-pill {
                transition: none;
            }
        }
    `;
}
