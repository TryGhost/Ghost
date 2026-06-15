import {useEffect, useState, type CSSProperties, type ReactElement} from 'react';
import {CloseIcon} from './CloseIcon';
import {dismissBar, shouldShowBar} from './dismissal';
import {cn} from '../../shared/cn';
import type {Services} from '../../types';

export type AnnouncementVariant = 'dark' | 'light' | 'accent';

interface AnnouncementData {
    announcement: string;
    announcement_background: string;
}

interface Props {
    data: AnnouncementData;
    services: Services;
}

/**
 * The announcement banner.
 *
 * Outer box styled with prefixed Tailwind utilities (gh:flex, gh:w-full, ...)
 * composed via cn(). Public class names — .gh-announcement-bar and
 * .gh-announcement-bar--{dark|light|accent} — are kept on the element as
 * theme-author hooks; themes can target them with overrides and win on
 * cascade specificity.
 */
export function AnnouncementBar({data, services}: Props): ReactElement | null {
    const variant = normaliseVariant(data.announcement_background);
    const [visible, setVisible] = useState(() => shouldShowBar(data.announcement));

    // Re-evaluate visibility when the announcement content changes — matches
    // the legacy component, which re-shows the bar for users who had previously
    // dismissed an older version once an admin edits the announcement.
    useEffect(() => {
        setVisible(shouldShowBar(data.announcement));
    }, [data.announcement]);

    if (!visible) {
        return null;
    }

    const handleDismiss = (): void => {
        dismissBar();
        setVisible(false);
    };

    const accentStyle: CSSProperties | undefined =
        variant === 'accent' ? {backgroundColor: 'var(--ghost-accent-color)'} : undefined;

    return (
        <div
            className={cn(
                // Public theme-override hooks.
                'gh-announcement-bar',
                `gh-announcement-bar--${variant}`,
                // Layout — prefixed utilities, no theme-CSS collision possible.
                'gh:relative gh:z-[90] gh:flex gh:w-full gh:items-center gh:justify-center gh:text-center',
                'gh:px-12 gh:py-3 gh:min-h-[48px] gh:text-[15px] gh:leading-[23px]',
                // Variant colours.
                variant === 'dark' && 'gh:bg-[#15171a] gh:text-white',
                variant === 'light' && 'gh:bg-[#f0f0f0] gh:text-[#15171a]',
                variant === 'accent' && 'gh:text-white'
            )}
            style={accentStyle}
        >
            <div
                className="gh-announcement-bar-content"
                dangerouslySetInnerHTML={{__html: data.announcement}}
            />
            <button
                type="button"
                aria-label={services.t('Close')}
                onClick={handleDismiss}
                className={cn(
                    'gh:absolute gh:end-2 gh:top-1/2 gh:-mt-4',
                    'gh:flex gh:h-8 gh:w-8 gh:items-center gh:justify-center',
                    'gh:border-0 gh:bg-transparent gh:p-0 gh:cursor-pointer',
                    variant === 'light' ? 'gh:text-[#888]' : 'gh:text-white'
                )}
            >
                <CloseIcon />
            </button>
        </div>
    );
}

function normaliseVariant(bg: string): AnnouncementVariant {
    if (bg === 'light' || bg === 'accent') {
        return bg;
    }
    return 'dark';
}
