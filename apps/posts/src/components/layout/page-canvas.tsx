import React from 'react';
import {cn} from '@tryghost/shade/utils';

/**
 * Content container for detail screens that mirrors the Ember admin's
 * `.gh-canvas` metrics (max-width 1200px, 24px side/bottom padding, 20px top
 * spacing for the header — see `body.react-admin .gh-canvas-header` in
 * apps/admin/src/index.css). Keeping these in sync prevents the layout from
 * shifting when navigating between Ember and React screens or when the labs
 * flags flip between shells.
 */
const PageCanvas: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({className, children, ...props}) => {
    return (
        <div className={cn('mx-auto w-full max-w-[1200px] px-6 pt-5 pb-6', className)} {...props}>
            {children}
        </div>
    );
};

export default PageCanvas;
