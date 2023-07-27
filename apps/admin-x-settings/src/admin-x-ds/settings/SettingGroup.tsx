import ButtonGroup from '../global/ButtonGroup';
import React, {useEffect, useRef, useState} from 'react';
import SettingGroupHeader from './SettingGroupHeader';
import clsx from 'clsx';
import useRouting from '../../hooks/useRouting';
import {ButtonProps} from '../global/Button';
import {SaveState} from '../../hooks/useForm';
import {useSearch} from '../../components/providers/ServiceProvider';

interface SettingGroupProps {
    navid?:string;
    testId?: string;
    title?: string;
    description?: React.ReactNode;
    keywords?: string[];
    isEditing?: boolean;
    saveState?: SaveState;
    customHeader?: React.ReactNode;
    customButtons?: React.ReactNode;
    children?: React.ReactNode;
    hideEditButton?: boolean;
    alwaysShowSaveButton?: boolean;

    /**
     * Remove borders and paddings
     */
    border?: boolean;
    styles?: string;

    /**
     * Default buttons only appear if onStateChange is implemented
     */
    onEditingChange?: (isEditing: boolean) => void
    onSave?: () => void
    onCancel?: () => void
}

const SettingGroup: React.FC<SettingGroupProps> = ({
    navid,
    testId,
    title,
    description,
    keywords = [],
    isEditing,
    saveState,
    customHeader,
    customButtons,
    children,
    hideEditButton,
    alwaysShowSaveButton = true,
    border = true,
    styles,
    onEditingChange,
    onSave,
    onCancel
}) => {
    const {checkVisible} = useSearch();
    const {yScroll, updateScrolled} = useRouting();
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const [currentRect, setCurrentRect] = useState<DOMRect>(DOMRect.fromRect());
    const topOffset = -60;
    const bottomOffset = 36;

    const handleEdit = () => {
        onEditingChange?.(true);
    };

    const handleCancel = () => {
        onCancel?.();
        onEditingChange?.(false);
    };

    const handleSave = () => {
        onSave?.();
    };

    if (saveState === 'unsaved') {
        styles += ' border-green';
    } else if (isEditing){
        styles += ' border-grey-300';
    } else {
        styles += ' border-grey-200';
    }

    let viewButtons: ButtonProps[] = [];

    if (!hideEditButton) {
        let label = 'Edit';
        if (saveState === 'saved') {
            label = 'Saved';
        }
        viewButtons.push(
            {
                label,
                key: 'edit',
                color: 'green',
                onClick: handleEdit
            }
        );
    } else if (saveState === 'saved') {
        viewButtons.push(
            {
                label: 'Saved',
                key: 'edit',
                color: 'green',
                onClick: handleEdit
            }
        );
    }

    let editButtons: ButtonProps[] = [
        {
            label: 'Cancel',
            key: 'cancel',
            onClick: handleCancel
        }
    ];

    if (saveState === 'unsaved' || alwaysShowSaveButton) {
        let label = 'Save';
        if (saveState === 'saving') {
            label = 'Saving...';
        }
        editButtons.push(
            {
                label,
                key: 'save',
                color: 'green',
                onClick: handleSave
            }
        );
    }

    useEffect(() => {
        if (scrollRef.current) {
            setCurrentRect(scrollRef.current.getBoundingClientRect());
        }
    }, [checkVisible(keywords)]);

    useEffect(() => {
        if (yScroll! >= currentRect.top + topOffset && yScroll! < currentRect.bottom + topOffset + bottomOffset) {
            updateScrolled(navid!);
        }
    }, [yScroll, currentRect, navid, updateScrolled, topOffset, bottomOffset]);

    return (
        <div ref={scrollRef} className={clsx('relative flex flex-col gap-6 rounded', border && 'border p-5 md:p-7', !checkVisible(keywords) && 'hidden', styles)} data-testid={testId}>
            {/* {yScroll} / {currentRect.top + topOffset} / {currentRect.bottom + topOffset + bottomOffset} */}
            <div className='absolute top-[-60px]' id={navid && navid}></div>
            {customHeader ? customHeader :
                <SettingGroupHeader description={description} title={title!}>
                    {customButtons ? customButtons :
                        (onEditingChange && <ButtonGroup buttons={isEditing ? editButtons : viewButtons} link={true} />)}
                </SettingGroupHeader>
            }
            {children}
        </div>
    );
};

export default SettingGroup;
