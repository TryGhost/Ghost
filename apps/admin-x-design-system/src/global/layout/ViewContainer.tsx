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
    type: 'page' | 'section';
    title?: string;

    /**
     * Sticks to top: 0 instead of keeping space for page toolbar
     */
    firstOnPage?:boolean;

    headerContent?: React.ReactNode;
    stickyHeader?: boolean;
    tabs?: ViewTab[];
    selectedTab?: string;
    selectedView?: string;
    onTabChange?: (id: string) => void;
    mainContainerClassName?: string;
    toolbarWrapperClassName?: string;
    toolbarContainerClassName?: string;
    toolbarLeftClassName?: string;
    toolbarBorder?: boolean;
    primaryAction?: PrimaryActionProps;
    actions?: (React.ReactElement<ButtonProps> | React.ReactElement<ButtonGroupProps> | React.ReactNode)[];
    actionsClassName?: string;
    actionsHidden?: boolean;
    contentWrapperClassName?: string;
    contentFullBleed?: boolean;
    children?: React.ReactNode;
}

const ViewContainer: React.FC<ViewContainerProps> = ({
    type,
    title,
    firstOnPage,
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
        type === 'page' && 'mx-auto w-full max-w-7xl bg-white px-12',
        (type === 'page' && stickyHeader) && (firstOnPage ? 'sticky top-0 pt-8' : 'sticky top-18 pt-[3vmin]'),
        toolbarContainerClassName
    );

    toolbarContainerClassName = clsx(
        'flex items-end justify-between pb-8',
        toolbarBorder && 'border-b border-grey-200',
        toolbarContainerClassName
    );

    toolbarLeftClassName = clsx(
        'flex flex-col',
        toolbarLeftClassName
    );

    actionsClassName = clsx(
        'flex items-center gap-6 transition-all',
        actionsHidden && 'opacity-0 group-hover/view-container:opacity-100',
        tabs?.length ? 'pb-2' : '',
        actionsClassName
    );

    const primaryActionContents = <>
        {(primaryAction?.title || primaryAction?.icon) && (
            <Button className={primaryAction.className} color={primaryAction.color || 'black'} icon={primaryAction.icon} label={primaryAction.title} size={type === 'page' ? 'md' : 'sm'} onClick={primaryAction.onClick} />
        )}
    </>;

    const headingClassName = clsx(
        tabs?.length && 'pb-3',
        '-mt-2'
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
        !contentFullBleed && 'max-w-7xl px-12',
        contentWrapperClassName,
        (!title && !actions) && 'pt-[3vmin]'
    );

    return (
        <section className={mainContainerClassName}>
            {(title || actions || headerContent) && toolbar}
            <div className={contentWrapperClassName}>
                {mainContent}
            </div>
        </section>
    );
};

export default ViewContainer;