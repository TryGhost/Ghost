import ButtonGroup from '../../../admin-x-ds/global/ButtonGroup';
import React, {useEffect, useRef, useState} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupHeader from '../../../admin-x-ds/settings/SettingGroupHeader';
import SettingGroupInputs from '../../../admin-x-ds/settings/SettingGroupInputs';
import SettingGroupValues from '../../../admin-x-ds/settings/SettingGroupValues';
import TextField from '../../../admin-x-ds/global/TextField';
import {ButtonColors} from '../../../admin-x-ds/global/Button';
import {TSettingGroupStates} from '../../../admin-x-ds/settings/SettingGroup';

const TitleAndDescription: React.FC = () => {
    const [isEditMode, setIsEditMode] = useState(false);
    const [isEdited, setIsEdited] = useState(false);
    const [siteTitle, setSiteTitleValue] = useState(`Dr. Evil's secret volcano lair`);
    const [siteDescription, setSiteDescriptionValue] = useState(`I'm doing this for fun`);
    const siteTitleRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditMode && siteTitleRef.current) {
            siteTitleRef.current.focus();
        }
    }, [isEditMode]);

    const handleEditClick = () => {
        setIsEditMode(true);
    };

    const handleCancelClick = () => {
        setIsEditMode(false);
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIsEdited(true);
        setSiteTitleValue(e.target.value);
    };

    const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIsEdited(true);
        setSiteDescriptionValue(e.target.value);
    };

    const viewButtons = [
        {
            label: 'Edit',
            key: 'edit',
            color: ButtonColors.Green,
            onClick: handleEditClick
        }
    ];

    const editButtons = [
        {
            label: 'Cancel',
            key: 'cancel',
            onClick: handleCancelClick
        },
        {
            label: 'Save',
            key: 'save',
            disabled: !isEdited,
            color: ButtonColors.Green
        }
    ];

    const viewValues = [
        {
            heading: 'Site title',
            key: 'site-title',
            value: siteTitle
        },
        {
            heading: 'Site description',
            key: 'site-description',
            value: siteDescription
        }
    ];

    const inputFields = (
        <SettingGroupInputs columns={2}>
            <TextField
                help="The name of your site"
                inputRef={siteTitleRef}
                placeholder="Site title"
                title="Site title"
                value={siteTitle}
                onChange={handleTitleChange}
            />
            <TextField
                help="Used in your theme, meta data and search results"
                placeholder="Enter something"
                title="Site description"
                value={siteDescription}
                onChange={handleDescriptionChange}
            />
        </SettingGroupInputs>
    );

    let settingGroupState: TSettingGroupStates = 'view';

    if (isEditMode) {
        settingGroupState = 'edit';
    }

    if (isEdited) {
        settingGroupState = 'unsaved';
    }

    return (
        <SettingGroup state={settingGroupState}>
            <SettingGroupHeader
                description="The details used to identify your publication around the web"
                title="Title & description"
            >
                <ButtonGroup buttons={isEditMode ? editButtons : viewButtons} link={true} />
            </SettingGroupHeader>
            {isEditMode ? inputFields : <SettingGroupValues columns={2} values={viewValues} />
            }
        </SettingGroup>
    );
};

export default TitleAndDescription;