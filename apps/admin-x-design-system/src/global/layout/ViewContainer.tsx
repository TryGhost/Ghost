import React from 'react';
import {Tab, TabList} from '../TabView';
import Heading from '../Heading';
import clsx from 'clsx';
import Button, {ButtonColor, ButtonProps} from '../Button';
import {ButtonGroupProps} from '../ButtonGroup';
import DynamicTable, {DynamicTableProps} from '../table/DynamicTable';

export interface View {
    id: string;
    buttonClasses?: string;
    buttonChildren: React.ReactNode;
    contents: React.ReactNode;
}

export interface ViewTab extends Tab {
    views?: View[];
}

export interface PrimaryActionProps {
    title?: string;
    icon?: string;
    color?: ButtonColor;
    className?: string;
    onClick?: () => void;
}

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
    tabs?: ViewTab[];
    selectedTab?: string;
    selectedView?: string;
    onTabChange?: (id: string) => void;
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
    actions?: (React.ReactElement<ButtonProps> | React.ReactElement<ButtonGroupProps> | React.ReactNode)[];
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
    selectedTab,
    onTabChange,
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

    const handleTabChange = (e: React.MouseEvent<HTMLButtonElement>) => {
        const newTab = e.currentTarget.id as string;
        onTabChange!(newTab);
    };

    let isSingleDynamicTable;
    let singleDynamicTableIsSticky = false;

    if (tabs?.length && !children) {
        if (!selectedTab) {
            selectedTab = tabs[0].id;
        }

        mainContent = <>
            {tabs.map((tab) => {
                return (
                    <>
                        {tab.contents &&
                            <div key={tab.id} className={`${selectedTab === tab.id ? 'block' : 'hidden'}`} role='tabpanel'>
                                <div>{tab.contents}</div>
                            </div>
                        }
                    </>
                );
            })}
        </>;
    } else if (React.isValidElement(children) && children.type === DynamicTable) {
        isSingleDynamicTable = true;
        const dynTable = (children as React.ReactElement<DynamicTableProps>);
        if (dynTable.props.stickyHeader || dynTable.props.stickyFooter) {
            singleDynamicTableIsSticky = true;
            children = isSingleDynamicTable
                ? React.cloneElement(dynTable, {
                    ...(dynTable.props as DynamicTableProps),
                    singlePageTable: true
                })
                : children;
        }
        mainContent = children;
    } else {
        mainContent = children;
    }

    toolbarWrapperClassName = clsx(
        'z-50',
        type === 'page' && 'mx-auto w-full max-w-7xl bg-white px-[4vw] tablet:px-12 dark:bg-black',
        (type === 'page' && stickyHeader) && (firstOnPage ? 'sticky top-0 pt-8' : 'sticky top-22 pt-[3vmin]'),
        toolbarContainerClassName
    );

    toolbarContainerClassName = clsx(
        'flex justify-between gap-5',
        (type === 'page' && actions?.length) ? (tabs?.length ? 'flex-col md:flex-row md:items-start' : 'flex-col md:flex-row md:items-end') : 'items-end',
        (firstOnPage && type === 'page' && !tabs?.length) ? 'pb-3 tablet:pb-8' : (tabs?.length ? '' : 'pb-2'),
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
        tabs?.length ? 'pb-1' : (type === 'page' ? 'pb-1' : ''),
        actionsClassName
    );

    const primaryActionContents = <>
        {(primaryAction?.title || primaryAction?.icon) && (
            <Button className={primaryAction.className} color={primaryAction.color || 'black'} icon={primaryAction.icon} label={primaryAction.title} size={type === 'page' ? 'md' : 'sm'} onClick={primaryAction.onClick} />
        )}
    </>;

    const headingClassName = clsx(
        tabs?.length && 'pb-3',
        type === 'page' && '-mt-2'
    );

    toolbar = (
        <div className={toolbarWrapperClassName}>
            <div className={toolbarContainerClassName}>
                <div className={toolbarLeftClassName}>
                    {headerContent}
                    {title && <Heading className={headingClassName} level={type === 'page' ? 1 : 4}>{title}</Heading>}
                    {tabs?.length && (
                        <TabList
                            border={false}
                            buttonBorder={true}
                            handleTabChange={handleTabChange}
                            selectedTab={selectedTab}
                            tabs={tabs!}
                            width='normal'
                        />
                    )}
                </div>
                <div className={actionsClassName}>
                    {actions}
                    {primaryActionContents}
                </div>
            </div>
        </div>
    );

    mainContainerClassName = clsx(
        'group/view-container flex flex-auto flex-col',
        mainContainerClassName
    );

    if (singleDynamicTableIsSticky) {
        contentFullBleed = true;
    }

    contentWrapperClassName = clsx(
        'relative mx-auto w-full flex-auto',
        (!contentFullBleed && type === 'page') && 'max-w-7xl px-[4vw] tablet:px-12',
        contentWrapperClassName,
        (!title && !actions) && 'pt-[3vmin]'
    );

    return (
        <section className={mainContainerClassName}>
            {(title || actions || headerContent || tabs) && toolbar}
            <div className={contentWrapperClassName}>
                {mainContent}
            </div>
        </section>
    );
};

export default ViewContainer;
