import React from 'react';
import AppContext from '../../app-context';
import MemberAvatar from '../common/member-gravatar';
import ActionButton from '../common/action-button';
import CloseButton from '../common/close-button';
import BackButton from '../common/back-button';
import InputForm from '../common/input-form';
import CustomFieldInput from '../common/custom-field-input';
import * as customFields from '../../../../../poc/custom-fields/repo';
import {ValidateInputForm} from '../../utils/form';
import {t} from '../../utils/i18n';

const isEmpty = value => value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);

export default class AccountProfilePage extends React.Component {
    static contextType = AppContext;

    constructor(props, context) {
        super(props, context);
        const {name = '', email = ''} = context.member || {};
        this.state = {
            name,
            email,
            // POC custom fields: account-surface placements, field definitions, entered values
            cfForm: [],
            cfDefs: [],
            cfValues: {}
        };
    }

    componentDidMount() {
        const {member} = this.context;
        if (!member) {
            this.context.doAction('switchPage', {
                page: 'signin'
            });
            return;
        }

        // POC: load the account form's custom fields + this member's values, live.
        this.loadCustomFields();
        this.cfUnsubscribe = customFields.subscribe(() => this.loadCustomFields());
    }

    componentWillUnmount() {
        this.cfUnsubscribe?.();
    }

    loadCustomFields() {
        // The Portal member object exposes `uuid` (not `id`); used as the per-member key.
        const memberId = this.context.member?.uuid;
        Promise.all([
            // POC: the account page mirrors the signup form — the member can
            // self-edit whatever custom fields the owner added to signup.
            customFields.getForm('signup'),
            customFields.listFields(),
            memberId ? customFields.getValues(memberId) : Promise.resolve({})
        ]).then(([form, cfDefs, cfValues]) => {
            // Keep only the custom-field placements (drop the built-in Email/Name
            // entries; those are already shown as the editable Name/Email above).
            const cfForm = form.filter(placement => cfDefs.some(def => def.id === placement.fieldId && !def.archived));
            this.setState({cfForm, cfDefs, cfValues});
        });
    }

    handleCustomChange(fieldId, value) {
        this.setState(state => ({
            cfValues: {...state.cfValues, [fieldId]: value}
        }));
    }

    getCustomRows() {
        return (this.state.cfForm || [])
            .map((placement) => {
                const def = (this.state.cfDefs || []).find(d => d.id === placement.fieldId);
                return (def && !def.archived) ? def : null;
            })
            .filter(Boolean);
    }

    handleSignout(e) {
        e.preventDefault();
        this.context.doAction('signout');
    }

    onBack() {
        this.context.doAction('back');
    }

    onProfileSave(e) {
        e.preventDefault();
        this.setState((state) => {
            const errors = ValidateInputForm({fields: this.getInputFields({state})});
            // POC: a custom field placed on the account form is required.
            (state.cfForm || []).forEach((placement) => {
                const def = (state.cfDefs || []).find(d => d.id === placement.fieldId);
                if (def && !def.archived && isEmpty(state.cfValues[def.id])) {
                    errors[def.id] = t('Please enter {fieldName}', {fieldName: def.label.toLowerCase()});
                }
            });
            return {errors};
        }, () => {
            const {email, name, errors} = this.state;
            const hasFormErrors = (errors && Object.values(errors).filter(d => !!d).length > 0);
            if (!hasFormErrors) {
                // POC: persist custom field values for this member, keyed by uuid.
                const memberId = this.context.member?.uuid;
                (this.state.cfForm || []).forEach((placement) => {
                    customFields.setValue(memberId, placement.fieldId, this.state.cfValues[placement.fieldId]);
                });
                this.context.doAction('clearPopupNotification');
                this.context.doAction('updateProfile', {email, name});
            }
        });
    }

    renderCustomFields() {
        const rows = this.getCustomRows();
        if (!rows.length) {
            return null;
        }
        const errors = this.state.errors || {};
        return rows.map(def => (
            <CustomFieldInput
                key={def.id}
                field={def}
                value={this.state.cfValues[def.id]}
                errorMessage={errors[def.id] || ''}
                onKeyDown={e => this.onKeyDown(e)}
                onChange={value => this.handleCustomChange(def.id, value)}
            />
        ));
    }

    renderSaveButton() {
        const isRunning = (this.context.action === 'updateProfile:running');
        let label = t('Save');
        if (this.context.action === 'updateProfile:failed') {
            label = t('Retry');
        }
        const disabled = isRunning ? true : false;
        return (
            <ActionButton
                dataTestId={'save-button'}
                isRunning={isRunning}
                onClick={e => this.onProfileSave(e)}
                disabled={disabled}
                brandColor={this.context.brandColor}
                label={label}
                style={{width: '100%'}}
            />
        );
    }

    renderDeleteAccountButton() {
        return (
            <div style={{cursor: 'pointer', color: 'red'}} role='button'>{t('Delete account')}</div>
        );
    }

    renderAccountFooter() {
        return (
            <footer className='gh-portal-action-footer'>
                {this.renderSaveButton()}
            </footer>
        );
    }

    renderHeader() {
        return (
            <header className='gh-portal-detail-header'>
                <BackButton brandColor={this.context.brandColor} hidden={!this.context.lastPage} onClick={e => this.onBack(e)} />
                <h3 className='gh-portal-main-title'>{t('Account settings')}</h3>
            </header>
        );
    }

    renderUserAvatar() {
        const avatarImg = (this.context.member && this.context.member.avatar_image);

        const avatarContainerStyle = {
            position: 'relative',
            display: 'flex',
            width: '64px',
            height: '64px',
            marginBottom: '6px',
            borderRadius: '100%',
            boxShadow: '0 0 0 3px #fff',
            border: '1px solid gray',
            overflow: 'hidden',
            justifyContent: 'center',
            alignItems: 'center'
        };

        return (
            <div style={avatarContainerStyle}>
                <MemberAvatar gravatar={avatarImg} style={{userIcon: {color: 'black', width: '56px', height: '56px'}}} />
            </div>
        );
    }

    handleInputChange(e, field) {
        const fieldName = field.name;
        this.setState({
            [fieldName]: e.target.value
        });
    }

    getInputFields({state, fieldNames}) {
        const errors = state.errors || {};
        const fields = [
            {
                type: 'text',
                value: state.name,
                placeholder: t('Jamie Larson'),
                label: t('Name'),
                name: 'name',
                required: false,
                errorMessage: errors.name || ''
            },
            {
                type: 'email',
                value: state.email,
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

    onKeyDown(e) {
        // Handles submit on Enter press
        if (e.keyCode === 13){
            this.onProfileSave(e);
        }
    }

    renderProfileData() {
        return (
            <div className='gh-portal-section'>
                <InputForm
                    fields={this.getInputFields({state: this.state})}
                    onChange={(e, field) => this.handleInputChange(e, field)}
                    onKeyDown={(e, field) => this.onKeyDown(e, field)}
                />
                {this.renderCustomFields()}
            </div>
        );
    }

    render() {
        const {member} = this.context;
        if (!member) {
            return null;
        }
        return (
            <>
                <div className='gh-portal-content with-footer'>
                    <CloseButton />
                    {this.renderHeader()}
                    <div className='gh-portal-section'>
                        {this.renderProfileData()}
                    </div>
                </div>
                {this.renderAccountFooter()}
            </>
        );
    }
}
