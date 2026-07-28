import React, {useEffect, useId, useState} from 'react';
import {Button} from '@tryghost/shade/components';
import {Inline} from '@tryghost/shade/primitives';
import {
    SettingGroup,
    SettingGroupActions,
    SettingGroupDescription,
    SettingGroupDetails,
    SettingGroupHeader,
    SettingGroupTitle
} from '@tryghost/shade/patterns';
import {createComponentId} from '../utils/search';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import {useScrollSection} from '../hooks/use-scroll-section';
import {useSearch} from './providers/settings-app-provider';

interface TopLevelGroupProps {
    keywords: string[];
    navid?: string;
    testId?: string;
    title?: React.ReactNode;
    description?: React.ReactNode;
    isEditing?: boolean;
    saveState?: 'unsaved' | 'saved' | 'saving' | string;
    headerMedia?: React.ReactNode;
    customButtons?: React.ReactNode;
    beta?: boolean;
    children?: React.ReactNode;
    hideEditButton?: boolean;
    alwaysShowSaveButton?: boolean;
    highlightOnModalClose?: boolean;
    enableCMDS?: boolean;
    onEditingChange?: (isEditing: boolean) => void;
    onSave?: () => void;
    onCancel?: () => void;
}

const TopLevelGroup: React.FC<TopLevelGroupProps> = ({
    keywords,
    navid,
    testId,
    title,
    description,
    isEditing = false,
    saveState,
    headerMedia,
    customButtons,
    beta = false,
    children,
    hideEditButton,
    alwaysShowSaveButton = true,
    highlightOnModalClose = true,
    enableCMDS = true,
    onEditingChange,
    onSave,
    onCancel
}) => {
    const {checkVisible, noResult, registerComponent, unregisterComponent} = useSearch();
    const {route} = useRouting();
    const [highlight, setHighlight] = useState(false);
    const {ref} = useScrollSection(navid);
    const uniqueId = useId();
    const componentId = createComponentId(navid || 'component', uniqueId);

    useEffect(() => {
        registerComponent(componentId, keywords);
        return () => {
            unregisterComponent(componentId);
        };
    }, [componentId, keywords, registerComponent, unregisterComponent]);

    useEffect(() => {
        setHighlight(route === navid);
        if (route === navid) {
            const timer = setTimeout(() => setHighlight(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [route, navid]);

    useEffect(() => {
        const handleSaveShortcut = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 's') {
                event.preventDefault();
                onSave?.();
            }
        };

        if (enableCMDS) {
            window.addEventListener('keydown', handleSaveShortcut);
            return () => window.removeEventListener('keydown', handleSaveShortcut);
        }
    }, [enableCMDS, onSave]);

    const handleCancel = () => {
        onCancel?.();
        onEditingChange?.(false);
    };

    const buttons = isEditing ? (
        <Inline className='-mt-1.25' gap='sm'>
            <Button size='sm' type='button' variant='ghost' onClick={handleCancel}>Cancel</Button>
            {(saveState === 'unsaved' || alwaysShowSaveButton) && (
                <Button disabled={saveState !== 'unsaved'} size='sm' type='button' onClick={onSave}>
                    {saveState === 'saving' ? 'Saving...' : 'Save'}
                </Button>
            )}
        </Inline>
    ) : (!hideEditButton || saveState === 'saved') ? (
        <Button className='-mt-1.25 -mr-1' size='sm' type='button' variant='ghost' onClick={() => onEditingChange?.(true)}>
            {saveState === 'saved' ? 'Saved' : 'Edit'}
        </Button>
    ) : null;

    const hasImageChild = React.Children.toArray(children).some(
        child => React.isValidElement(child) && child.type === 'img'
    );

    const wrappedChildren = hasImageChild ? (
        <div className="-mx-5 -mb-5 overflow-hidden rounded-b-xl bg-muted md:-mx-7 md:-mb-7">
            {React.Children.map(children, child => (React.isValidElement<React.ImgHTMLAttributes<HTMLImageElement>>(child) && child.type === 'img'
                ? React.cloneElement(child, {
                    className: `${child.props.className || ''} h-full w-full rounded-b-xl`.trim()
                })
                : child)
            )}
        </div>
    ) : children;

    const isVisible = checkVisible(keywords) || noResult;

    return (
        <SettingGroup
            className={isVisible ? undefined : 'hidden'}
            data-testid={testId}
            editing={isEditing}
            highlighted={(highlight && highlightOnModalClose) || isEditing}
        >
            <div ref={ref} className='absolute' id={navid} />
            {headerMedia}
            {(title || description || customButtons || onEditingChange) && (
                <SettingGroupHeader>
                    {(title || description) && (
                        <SettingGroupDetails>
                            {title && (
                                <SettingGroupTitle>
                                    {title}
                                    {beta && <sup className='ml-0.5 text-[10px] font-semibold tracking-wide uppercase'>Beta</sup>}
                                </SettingGroupTitle>
                            )}
                            {description && <SettingGroupDescription>{description}</SettingGroupDescription>}
                        </SettingGroupDetails>
                    )}
                    <SettingGroupActions>
                        {customButtons || (onEditingChange && buttons)}
                    </SettingGroupActions>
                </SettingGroupHeader>
            )}
            {wrappedChildren}
        </SettingGroup>
    );
};

export default TopLevelGroup;
