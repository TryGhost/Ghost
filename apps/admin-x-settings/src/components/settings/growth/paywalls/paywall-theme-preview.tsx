import React from 'react';
import {textColorForBackgroundColor} from '@tryghost/color-utils';

// Representative preview of the theme's built-in content CTA — the
// `.gh-post-upgrade-cta` box Ghost renders via `{{content}}` (content-cta.hbs)
// when a non-member hits gated content. This is what a reader sees when the
// paywall is left to the theme rather than customised with the CTA cards.
const PaywallThemePreview: React.FC<{accentColor: string}> = ({accentColor}) => {
    const textColor = textColorForBackgroundColor(accentColor).hex();

    return (
        <aside className='w-full' data-testid='paywall-theme-preview'>
            <div
                className='flex flex-col items-center gap-4 rounded-lg px-8 py-12 text-center'
                style={{backgroundColor: accentColor, color: textColor}}
            >
                <h2 className='text-2xl font-bold'>This post is for subscribers only</h2>
                <a
                    className='inline-flex h-10 items-center rounded-md bg-white px-5 text-sm font-semibold'
                    href='#'
                    style={{color: accentColor}}
                    onClick={e => e.preventDefault()}
                >
                    Subscribe now
                </a>
                <p className='text-sm opacity-80'>
                    Already have an account? <span className='underline'>Sign in</span>
                </p>
            </div>
        </aside>
    );
};

export default PaywallThemePreview;
