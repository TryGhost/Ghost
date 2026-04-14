export const ShareModalStyles = `
    .gh-portal-popup-container.share {
        width: 560px;
    }

    .gh-portal-share-header {
        margin-bottom: 20px;
    }

    .gh-portal-share-header .gh-portal-main-title {
        text-align: left;
        font-size: 2.1rem;
        font-weight: 600;
    }
    html[dir="rtl"] .gh-portal-share-header .gh-portal-main-title {
        text-align: right;
    }

    .gh-portal-share-actions {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: 20px;
        position: relative;
    }

    .gh-portal-share-preview {
        display: flex;
        flex-direction: column;
        border: 1px solid var(--grey12);
        border-radius: 12px;
    }

    .gh-portal-share-preview-image {
        width: 100%;
        aspect-ratio: 16 / 9;
        border-radius: 12px 12px 0 0;
        object-fit: cover;
        background: var(--grey14);
    }

    .gh-portal-share-preview-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 16px;
    }

    .gh-portal-share-preview-title {
        margin: 0;
        color: var(--grey0);
        font-size: 1.9rem;
        font-weight: 600;
        line-height: 1.35;
        text-wrap: pretty;
    }

    .gh-portal-share-preview-excerpt {
        margin: -8px 0 0;
        color: var(--grey6);
        font-size: 1.5rem;
        line-height: 1.45;
        text-wrap: pretty;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    .gh-portal-share-preview-footer {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: -6px;
        min-height: 18px;
    }

    .gh-portal-share-preview-favicon {
        width: 16px;
        height: 16px;
        border-radius: 4px;
        object-fit: cover;
        flex: 0 0 auto;
    }

    .gh-portal-share-preview-meta {
        display: flex;
        align-items: center;
        gap: 4px;
        min-width: 0;
        color: var(--grey3);
        font-size: 1.35rem;
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .gh-portal-share-preview-site,
    .gh-portal-share-preview-author {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .gh-portal-share-preview-separator {
        flex: 0 0 auto;
    }

    .gh-portal-share-preview-site {
        font-weight: 500;
    }

    .gh-portal-share-action {
        height: 44px;
        max-width: 70px;
        min-width: 0;
        padding: 0 16px;
        border-radius: 8px;
        border: 1px solid var(--grey12);
        background: var(--white);
        color: var(--grey2);
    }

    .gh-portal-share-action:hover {
        border-color: var(--grey10);
    }

    .gh-portal-share-action.copy {
        width: auto;
        max-width: none;
        flex: 1 0 auto;
        padding: 0 14px;
        justify-content: center;
        border: none;
        color: var(--white);
        background: var(--brandcolor, #3eb0ef);
        gap: 8px;
    }

    .gh-portal-share-action.more {
        font-size: 2rem;
        font-weight: 700;
        line-height: 1;
        letter-spacing: 0;
    }

    .gh-portal-share-more {
        position: relative;
    }

    .gh-portal-share-more-menu {
        position: absolute;
        bottom: calc(100% + 8px);
        right: 0;
        display: flex;
        flex-direction: column;
        min-width: 180px;
        padding: 6px;
        border: 1px solid var(--grey12);
        border-radius: 8px;
        background: var(--white);
        box-shadow: 0 8px 20px rgba(var(--blackrgb), 0.12);
        z-index: 2;
        opacity: 0;
        transform: translateY(8px);
        transform-origin: bottom right;
        animation: gh-portal-share-more-menu-in 0.18s ease-out forwards;
    }
    html[dir="rtl"] .gh-portal-share-more-menu {
        right: unset;
        left: 0;
        transform-origin: bottom left;
    }

    @keyframes gh-portal-share-more-menu-in {
        from {
            opacity: 0;
            transform: translateY(8px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .gh-portal-share-more-item {
        display: flex;
        align-items: center;
        gap: 8px;
        height: 36px;
        padding: 0 10px;
        color: var(--grey1);
        font-size: 1.4rem;
        font-weight: 500;
        line-height: 1;
        text-decoration: none;
        border-radius: 6px;
        border: none;
    }

    .gh-portal-share-more-item:hover {
        background: var(--grey14);
    }

    .gh-portal-share-more-item-icon {
        display: inline-flex;
        width: 16px;
        height: 16px;
        align-items: center;
        justify-content: center;
        line-height: 0;
    }

    .gh-portal-share-more-item-icon svg {
        width: 16px;
        height: 16px;
    }

    .gh-portal-share-label {
        font-size: 1.4rem;
        font-weight: 500;
        line-height: 1;
        color: var(--white);
        white-space: nowrap;
    }

    .gh-portal-share-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: 999px;
        line-height: 0;
    }

    .gh-portal-share-icon svg {
        width: 20px;
        height: 20px;
    }

    .gh-portal-share-icon.x svg {
        width: 16px;
        height: 16px;
    }

    .gh-portal-share-icon.copied {
        background: color-mix(in srgb, var(--brandcolor) 14%, var(--white));
        color: var(--brandcolor);
    }

    .gh-portal-share-icon.copied svg {
        width: 12px;
        height: 12px;
    }

    .gh-portal-share-icon.copied svg path {
        stroke: currentColor;
    }

    .gh-portal-share .gh-portal-closeicon-container {
        top: 20px;
    }

    @media (max-width: 420px) {
        .gh-portal-share-actions {
            flex-direction: column;
            align-items: stretch;
        }

        .gh-portal-share-action {
            width: 100%;
            max-width: none;
            flex: 0 0 auto;
        }

        .gh-portal-share-action.copy {
            order: 1;
            justify-content: center;
        }

        .gh-portal-share-action.twitter {
            order: 2;
        }

        .gh-portal-share-action.linkedin {
            order: 3;
        }

        .gh-portal-share-action.email {
            order: 4;
        }

        .gh-portal-share-action.more {
            order: 5;
        }

        .gh-portal-share-more {
            width: 100%;
        }

        .gh-portal-share-more-menu {
            left: 0;
            right: 0;
        }
        html[dir="rtl"] .gh-portal-share-more-menu {
            left: 0;
            right: 0;
        }
    }

`;
