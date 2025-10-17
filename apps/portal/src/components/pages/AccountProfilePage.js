import React, {useContext, useState, useEffect} from 'react';
import AppContext from '../../AppContext';
import MemberAvatar from '../common/MemberGravatar';
import ActionButton from '../common/ActionButton';
import CloseButton from '../common/CloseButton';
import BackButton from '../common/BackButton';
import InputForm from '../common/InputForm';
import {ValidateInputForm} from '../../utils/form';
import {t} from '../../utils/i18n';

function getInputFields({name, email, errors = {}, fieldNames}) {
    const fields = [
        {
            type: 'text',
            value: name,
            placeholder: t('Jamie Larson'),
            label: t('Name'),
            name: 'name',
            required: false,
            errorMessage: errors.name || ''
        },
        {
            type: 'email',
            value: email,
            placeholder: t('jamie@example.com'),
            label: t('Email'),
            name: 'email',
            required: true,
            errorMessage: errors.email || ''
        }
    ];
    if (fieldNames && fieldNames.length > 0) {
        return fields.filter((f) => {
            return fieldNames.includes(f.name);
        });
    }
    return fields;
}

function AccountProfilePage() {
    const {member, doAction, action, brandColor, lastPage} = useContext(AppContext);

    const [name, setName] = useState(member?.name || '');
    const [email, setEmail] = useState(member?.email || '');
    const [errors, setErrors] = useState({});

    // Redirect to signin if no member
    useEffect(() => {
        if (!member) {
            doAction('switchPage', {
                page: 'signin'
            });
        }
    }, [member, doAction]);

    const onBack = () => {
        doAction('back');
    };

    const handleInputChange = (e, field) => {
        const fieldName = field.name;
        if (fieldName === 'name') {
            setName(e.target.value);
        } else if (fieldName === 'email') {
            setEmail(e.target.value);
        }
    };

    const onProfileSave = (e) => {
        e.preventDefault();

        const fields = getInputFields({name, email, errors});
        const validationErrors = ValidateInputForm({fields});
        setErrors(validationErrors);

        const hasFormErrors = (validationErrors && Object.values(validationErrors).filter(d => !!d).length > 0);
        if (!hasFormErrors) {
            doAction('clearPopupNotification');
            doAction('updateProfile', {email, name});
        }
    };

    const onKeyDown = (e) => {
        // Handles submit on Enter press
        if (e.keyCode === 13) {
            onProfileSave(e);
        }
    };

    const renderSaveButton = () => {
        const isRunning = (action === 'updateProfile:running');
        let label = t('Save');
        if (action === 'updateProfile:failed') {
            label = t('Retry');
        }
        const disabled = isRunning ? true : false;
        return (
            <ActionButton
                dataTestId={'save-button'}
                isRunning={isRunning}
                onClick={e => onProfileSave(e)}
                disabled={disabled}
                brandColor={brandColor}
                label={label}
                style={{width: '100%'}}
            />
        );
    };

    const renderAccountFooter = () => {
        return (
            <footer className='gh-portal-action-footer'>
                {renderSaveButton()}
            </footer>
        );
    };

    const renderHeader = () => {
        return (
            <header className='gh-portal-detail-header'>
                <BackButton brandColor={brandColor} hidden={!lastPage} onClick={e => onBack(e)} />
                <h3 className='gh-portal-main-title'>{t('Account settings')}</h3>
            </header>
        );
    };

    const renderProfileData = () => {
        return (
            <div className='gh-portal-section'>
                <InputForm
                    fields={getInputFields({name, email, errors})}
                    onChange={(e, field) => handleInputChange(e, field)}
                    onKeyDown={(e, field) => onKeyDown(e, field)}
                />
            </div>
        );
    };

    if (!member) {
        return null;
    }

    return (
        <>
            <div className='gh-portal-content with-footer'>
                <CloseButton />
                {renderHeader()}
                <div className='gh-portal-section'>
                    {renderProfileData()}
                </div>
            </div>
            {renderAccountFooter()}
        </>
    );
}

export default AccountProfilePage;
