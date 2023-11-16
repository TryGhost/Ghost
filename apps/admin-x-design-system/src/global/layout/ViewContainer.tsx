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
    headingContainerClassName?: string;
    headingLeftClassName?: string;
    headingBorder?: boolean;
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
    headingContainerClassName,
    headingLeftClassName,
    primaryAction,
    actions,
    actionsClassName,
    actionsHidden,
    headingBorder = true,
    children
}) => {
    let heading = <></>;
    let mainContent:React.ReactNode = <></>;

    const handleTabChange = (e: React.MouseEvent<HTMLButtonElement>) => {
        const newTab = e.currentTarget.id as string;
        onTabChange!(newTab);
    };

    // const handleViewChange = (e: React.MouseEvent<HTMLButtonElement>) => {
    //     const newView = e.currentTarget.id as string;
    //     onViewChange!(newView);
    // };

    if (tabs?.length) {
        if (!selectedTab) {
            selectedTab = tabs[0].id;
        }

        mainContent = <>
            {tabs.map((tab) => {
                // if (tab.views?.length) {
                //     if (!selectedView) {
                //         selectedView = tab.views[0].id;
                //     }

                //     if (selectedTab === tab.id) {
                //         viewSwitcher = <div className='flex items-center gap-2'>
                //             {tab.views.map((view) => {
                //                 const buttonClasses = clsx(
                //                     'cursor-pointer',
                //                     selectedView === view.id ? 'text-black' : 'text-grey-500',
                //                     view.buttonClasses
                //                 );
                //                 return (
                //                     <button key={view.id} className={buttonClasses} id={view.id} type='button' onClick={handleViewChange}>{view.buttonChildren}</button>
                //                 );
                //             })}
                //         </div>;
                //     }

                //     return (
                //         <div key={tab.id} className={`${selectedTab === tab.id ? 'block' : 'hidden'}`} role='tabpanel'>
                //             {tab.views.map((view) => {
                //                 return (<>
                //                     {view.contents &&
                //                         <div key={view.id} className={`${selectedView === view.id ? 'block' : 'hidden'}`} role='tabpanel'>
                //                             {view.contents}
                //                         </div>
                //                     }
                //                 </>);
                //             })}
                //         </div>
                //     );
                // } else {
                //     return (
                //         <>
                //             {tab.contents &&
                //                 <div key={tab.id} className={`${selectedTab === tab.id ? 'block' : 'hidden'}`} role='tabpanel'>
                //                     <div>{tab.contents}</div>
                //                 </div>
                //             }
                //         </>
                //     );
                // }
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

    // const actions = <div className='flex gap-5 pb-2'>
    //     {viewSwitcher}
    // </div>;

    headingContainerClassName = clsx(
        'flex flex-auto items-end justify-between gap-5',
        headingBorder && 'border-b border-grey-200',
        headingContainerClassName
    );

    headingLeftClassName = clsx(
        'flex flex-col',
        headingLeftClassName
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

    heading = (
        <div className={headingContainerClassName}>
            <div className={headingLeftClassName}>
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
            {heading}
            {mainContent}
        </section>
    );
};

export default ViewContainer;