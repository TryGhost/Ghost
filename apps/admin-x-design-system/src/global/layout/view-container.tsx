import React from 'react';
import clsx from 'clsx';
import {Text} from '@tryghost/shade/primitives';

export interface View {
    id: string;
    buttonClasses?: string;
    buttonChildren: React.ReactNode;
    contents: React.ReactNode;
}

export type PrimaryActionProps = React.ReactNode;

interface ViewContainerProps {
    /**
     * Use `page` if the `ViewContainer` is your main component on the page. Use
     * `section` for individual sections on the page (e.g. blocks on a dashboard).
     */
    type: 'page' | 'section';

    /**
     * The title of the ViewContainer. `page` type containers will use a large
     * size that matches the rest of the page titles in the Admin.
     */
    title?: string;

    /**
     * Use this if there's no toolbar on the page and you use the `ViewContainer`
     * as the main container on a page. Technically it sticks the header to
     * the top of the page with the actions aligned properly to match other
     * pages in the Admin.
     */
    firstOnPage?:boolean;

    /**
     * Use this for custom content in the header.
     */
    headerContent?: React.ReactNode;

    /**
     * Sticks the header so it's always visible. The `top` value depends on the
     * value of `firstOnPage`:
     *
     * ```
     * firstOnPage = true    -> top: 0px;
     * firstOnPage = false   -> top: 3vmin;
     * ```
     */
    stickyHeader?: boolean;

    /**
     * Use this to break down the view to multiple tabs.
     */
    tabs?: React.ReactNode;
    selectedView?: string;
    mainContainerClassName?: string;
    toolbarWrapperClassName?: string;
    toolbarContainerClassName?: string;
    toolbarLeftClassName?: string;
    toolbarBorder?: boolean;

    /**
     * The primary action appears in the view container's top right usually as a solid
     * button.
     */
    primaryAction?: PrimaryActionProps;

    /**
     * Adds more actions by the primary action, primarily buttons and button groups.
     */
    actions?: React.ReactNode[];
    actionsClassName?: string;
    actionsHidden?: boolean;
    contentWrapperClassName?: string;

    /**
     * Sets the width of the view container full bleed
     */
    contentFullBleed?: boolean;
    children?: React.ReactNode;
}

/**
 * The `ViewContainer` component is a generic container for either the complete
 * contents of a page (`type = 'page'`) or for individual sections on a
 * page, like blocks on a dashboard (`type = 'section'`). It has a bunch of
 * parameters to customise its look & feel.
 */
const ViewContainer: React.FC<ViewContainerProps> = ({
    type,
    title,
    firstOnPage = true,
    headerContent,
    stickyHeader = true,
    tabs,
    mainContainerClassName,
    toolbarWrapperClassName,
    toolbarContainerClassName,
    toolbarLeftClassName,
    primaryAction,
    actions,
    actionsClassName,
    actionsHidden,
    toolbarBorder = true,
    contentWrapperClassName,
    contentFullBleed = false,
    children
}) => {
    let toolbar = <></>;
    let mainContent:React.ReactNode = <></>;

    mainContent = children;

    toolbarWrapperClassName = clsx(
        'z-50',
        type === 'page' && 'mx-auto w-full max-w-7xl bg-white px-[4vw] tablet:px-12 dark:bg-black',
        (type === 'page' && stickyHeader) && (firstOnPage ? 'sticky top-0 pt-8' : 'sticky top-22 pt-[3vmin]'),
        toolbarContainerClassName
    );

    toolbarContainerClassName = clsx(
        'flex justify-between gap-5',
        (type === 'page' && actions?.length) ? (tabs ? 'flex-col md:flex-row md:items-start' : 'flex-col md:flex-row md:items-end') : 'items-end',
        (firstOnPage && type === 'page' && !tabs) ? 'pb-3 tablet:pb-8' : (tabs ? '' : 'pb-2'),
        toolbarBorder && 'border-b border-grey-200 dark:border-grey-900',
        toolbarContainerClassName
    );

    toolbarLeftClassName = clsx(
        'flex flex-col',
        toolbarLeftClassName
    );

    actionsClassName = clsx(
        'flex items-center justify-between gap-3 transition-all tablet:justify-start tablet:gap-5',
        actionsHidden && 'opacity-0 group-hover/view-container:opacity-100',
        tabs ? 'pb-1' : (type === 'page' ? 'pb-1' : ''),
        actionsClassName
    );

    const headingClassName = clsx(
        tabs && 'pb-3',
        type === 'page' && '-mt-2'
    );

    toolbar = (
        <div className={toolbarWrapperClassName}>
            <div className={toolbarContainerClassName}>
                <div className={toolbarLeftClassName}>
                    {headerContent}
                    {title && (type === 'page' ?
                        <Text as='h1' className={clsx('text-4xl', headingClassName)} leading='supertight' weight='bold'>{title}</Text> :
                        <Text as='h4' className={clsx('md:text-xl', headingClassName)} leading='heading' size='lg' weight='bold'>{title}</Text>
                    )}
                    {tabs}
                </div>
                <div className={actionsClassName}>
                    {actions}
                    {primaryAction}
                </div>
            </div>
        </div>
    );

    mainContainerClassName = clsx(
        'group/view-container flex flex-auto flex-col',
        mainContainerClassName
    );

    contentWrapperClassName = clsx(
        'relative mx-auto w-full flex-auto',
        (!contentFullBleed && type === 'page') && 'max-w-7xl px-[4vw] tablet:px-12',
        contentWrapperClassName,
        (!title && !actions) && 'pt-[3vmin]'
    );

    return (
        <section className={mainContainerClassName}>
            {(title || actions || primaryAction || headerContent || tabs) && toolbar}
            <div className={contentWrapperClassName}>
                {mainContent}
            </div>
        </section>
    );
};

export default ViewContainer;
