import React from 'react';
import {Tab, TabList} from '../TabView';
import Heading from '../Heading';
import clsx from 'clsx';
import Button, {ButtonColor, ButtonProps} from '../Button';
import {ButtonGroupProps} from '../ButtonGroup';

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
    title: string;
    color?: ButtonColor
    onClick?: () => void;
}

interface ViewContainerProps {
    type: 'page' | 'section';
    title?: string;
    tabs?: ViewTab[];
    selectedTab?: string;
    selectedView?: string;
    onTabChange?: (id: string) => void;
    mainContainerClassName?: string;
    toolbarContainerClassName?: string;
    toolbarLeftClassName?: string;
    toolbarBorder?: boolean;
    primaryAction?: PrimaryActionProps;
    actions?: (React.ReactElement<ButtonProps> | React.ReactElement<ButtonGroupProps>)[];
    actionsClassName?: string;
    actionsHidden?: boolean;
    children?: React.ReactNode;
}

const ViewContainer: React.FC<ViewContainerProps> = ({
    type,
    title,
    tabs,
    selectedTab,
    onTabChange,
    mainContainerClassName,
    toolbarContainerClassName,
    toolbarLeftClassName,
    primaryAction,
    actions,
    actionsClassName,
    actionsHidden,
    toolbarBorder = true,
    children
}) => {
    let toolbar = <></>;
    let mainContent:React.ReactNode = <></>;

    const handleTabChange = (e: React.MouseEvent<HTMLButtonElement>) => {
        const newTab = e.currentTarget.id as string;
        onTabChange!(newTab);
    };

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
    } else if (children) {
        mainContent = children;
    }

    toolbarContainerClassName = clsx(
        'flex flex-auto items-end justify-between gap-5',
        toolbarBorder && 'border-b border-grey-200',
        toolbarContainerClassName
    );

    toolbarLeftClassName = clsx(
        'flex flex-col',
        toolbarLeftClassName
    );

    actionsClassName = clsx(
        'flex items-center gap-10 transition-all',
        actionsHidden && 'opacity-0 group-hover/view-container:opacity-100',
        tabs?.length ? 'pb-2' : 'pb-3',
        actionsClassName
    );

    if (primaryAction) {
        primaryAction!.color = 'black';
    }

    const primaryActionContents = <>
        {primaryAction?.title && (
            <Button color={primaryAction.color} label={primaryAction.title} size={type === 'page' ? 'md' : 'sm'} onClick={primaryAction.onClick} />
        )}
    </>;

    toolbar = (
        <div className={toolbarContainerClassName}>
            <div className={toolbarLeftClassName}>
                {title && <Heading className={tabs?.length ? 'pb-3' : 'pb-2'} level={type === 'page' ? 1 : 4}>{title}</Heading>}
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
    );

    mainContainerClassName = clsx(
        'group/view-container',
        mainContainerClassName
    );

    return (
        <section className={mainContainerClassName}>
            {toolbar}
            {mainContent}
        </section>
    );
};

export default ViewContainer;