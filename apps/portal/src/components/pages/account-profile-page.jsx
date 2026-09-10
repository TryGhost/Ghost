import React from 'react';
import AppContext from '../../app-context';
import MemberAvatar from '../common/member-gravatar';
import ActionButton from '../common/action-button';
import CloseButton from '../common/close-button';
import BackButton from '../common/back-button';
import InputForm from '../common/input-form';
import { ValidateInputForm } from '../../utils/form';
import { t } from '../../utils/i18n';
import { customFieldPartLabel } from '../../utils/helpers';
import { countryOptions } from '../../utils/countries';
import { FIELD_TYPE_IDS, partTypesOf, subFieldsOf } from '@tryghost/metafield-types/structure';

/**
 * How an address is laid out: the short parts share a row, as Stripe's checkout does.
 * Presentation only; which parts exist, and the order they are shown in, comes from
 * the field type. A part this layout does not name gets a row of its own, so a part
 * added to the type is still there to fill in.
 */
const ADDRESS_ROWS = [['line1'], ['line2'], ['city', 'state'], ['postal_code', 'country']];

function addressRows(inputs) {
  const named = ADDRESS_ROWS.flat();
  const rows = ADDRESS_ROWS.map((parts) => inputs.filter((input) => parts.includes(input.part)));
  inputs.filter((input) => !named.includes(input.part)).forEach((input) => rows.push([input]));
  return rows.filter((row) => row.length > 0);
}

/** A part is changed when what the member has differs from what the site holds. */
const changedParts = (parts, current, original) =>
  parts.filter((part) => (current?.[part] ?? '') !== (original?.[part] ?? ''));

export default class AccountProfilePage extends React.Component {
  static contextType = AppContext;

  constructor(props, context) {
    super(props, context);
    const { name = '', email = '', metafields } = context.member || {};
    this.state = {
      name,
      email,
      metafields: metafields?.custom || {},
    };
  }

  componentDidMount() {
    const { member, customFields } = this.context;
    if (!member) {
      this.context.doAction('switchPage', {
        page: 'signin',
      });
      return;
    }
    // The account page asks for these on the way here; a link straight to this page
    // arrives without them.
    if (customFields === null) {
      this.context.doAction('loadCustomFields');
    }
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
    this.setState(
      (state) => {
        return {
          errors: ValidateInputForm({ fields: this.getInputFields({ state }) }),
        };
      },
      () => {
        const { email, name, errors } = this.state;
        const hasFormErrors = errors && Object.values(errors).filter((d) => !!d).length > 0;
        if (!hasFormErrors) {
          this.context.doAction('clearPopupNotification');
          const metafields = this.getChangedMetafields();
          this.context.doAction('updateProfile', {
            email,
            name,
            ...(metafields ? { metafields } : {}),
          });
        }
      },
    );
  }

  renderSaveButton() {
    const isRunning = this.context.action === 'updateProfile:running';
    let label = t('Save');
    if (this.context.action === 'updateProfile:failed') {
      label = t('Retry');
    }
    const disabled = isRunning ? true : false;
    return (
      <ActionButton
        dataTestId={'save-button'}
        isRunning={isRunning}
        onClick={(e) => this.onProfileSave(e)}
        disabled={disabled}
        brandColor={this.context.brandColor}
        label={label}
        style={{ width: '100%' }}
      />
    );
  }

  renderDeleteAccountButton() {
    return (
      <div style={{ cursor: 'pointer', color: 'red' }} role="button">
        {t('Delete account')}
      </div>
    );
  }

  renderAccountFooter() {
    return <footer className="gh-portal-action-footer">{this.renderSaveButton()}</footer>;
  }

  renderHeader() {
    return (
      <header className="gh-portal-detail-header">
        <BackButton
          brandColor={this.context.brandColor}
          hidden={!this.context.lastPage}
          onClick={(e) => this.onBack(e)}
        />
        <h3 className="gh-portal-main-title">{t('Account settings')}</h3>
      </header>
    );
  }

  renderUserAvatar() {
    const avatarImg = this.context.member && this.context.member.avatar_image;

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
      alignItems: 'center',
    };

    return (
      <div style={avatarContainerStyle}>
        <MemberAvatar
          gravatar={avatarImg}
          style={{ userIcon: { color: 'black', width: '56px', height: '56px' } }}
        />
      </div>
    );
  }

  handleInputChange(e, field) {
    const { value } = e.target;
    if (field.customField) {
      const { key } = field.customField;
      this.setState(({ metafields }) => ({
        metafields: {
          ...metafields,
          [key]: field.part ? { ...(metafields[key] || {}), [field.part]: value } : value,
        },
      }));
      return;
    }
    this.setState({
      [field.name]: value,
    });
  }

  /** The opened fields this build can draw: a type it has never heard of is left out. */
  customFields() {
    return (this.context.customFields || []).filter((field) => FIELD_TYPE_IDS.includes(field.type));
  }

  /**
   * What the member changed, in the shape the members API takes: only writable fields,
   * since naming one they may only read refuses the whole save, and only the parts of
   * an address they touched, since each part records who last wrote it. An address
   * emptied of every part is cleared rather than sent empty.
   */
  getChangedMetafields() {
    const original = this.context.member.metafields?.custom || {};
    const custom = {};
    this.customFields()
      .filter((field) => field.access.member === 'write')
      .forEach((field) => {
        const value = this.state.metafields[field.key];
        const parts = subFieldsOf(field.type);
        if (!parts) {
          if ((value ?? '') !== (original[field.key] ?? '')) {
            custom[field.key] = value;
          }
          return;
        }
        const changed = changedParts(parts, value, original[field.key]);
        if (changed.length === 0) {
          return;
        }
        custom[field.key] = parts.some((part) => value?.[part])
          ? Object.fromEntries(changed.map((part) => [part, value[part]]))
          : null;
      });
    return Object.keys(custom).length > 0 ? { custom } : undefined;
  }

  /** Input descriptors for one custom field: one for a scalar, one per part for an address. */
  getCustomFieldInputs(field) {
    const readOnly = field.access.member !== 'write';
    const value = this.state.metafields[field.key];
    const parts = subFieldsOf(field.type);
    if (!parts) {
      return [
        {
          type: field.type === 'long_text' ? 'textarea' : 'text',
          value: value ?? '',
          label: field.name,
          name: `custom:${field.key}`,
          readOnly,
          customField: field,
        },
      ];
    }
    const partTypes = partTypesOf(field.type);
    return parts.map((part) => {
      const label = customFieldPartLabel(part);
      const isCountry = partTypes[part] === 'country_code';
      return {
        type: isCountry ? 'select' : 'text',
        options: isCountry ? countryOptions(value?.[part]) : undefined,
        value: value?.[part] ?? '',
        // The part's label is read by assistive tech and shown as the placeholder; the
        // field's own name labels the group.
        label,
        hideLabel: true,
        placeholder: label,
        name: `custom:${field.key}:${part}`,
        readOnly,
        customField: field,
        part,
      };
    });
  }

  getInputFields({ state, fieldNames }) {
    const errors = state.errors || {};
    const fields = [
      {
        type: 'text',
        value: state.name,
        placeholder: t('Jamie Larson'),
        label: t('Name'),
        name: 'name',
        required: false,
        errorMessage: errors.name || '',
      },
      {
        type: 'email',
        value: state.email,
        placeholder: t('jamie@example.com'),
        label: t('Email'),
        name: 'email',
        required: true,
        errorMessage: errors.email || '',
      },
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
    if (e.keyCode === 13) {
      this.onProfileSave(e);
    }
  }

  renderCustomFields() {
    const onChange = (e, input) => this.handleInputChange(e, input);
    const onKeyDown = (e, input) => this.onKeyDown(e, input);
    return this.customFields().map((field) => {
      const inputs = this.getCustomFieldInputs(field);
      if (!subFieldsOf(field.type)) {
        return (
          <InputForm key={field.key} fields={inputs} onChange={onChange} onKeyDown={onKeyDown} />
        );
      }
      const labelId = `custom-${field.key}-label`;
      return (
        <section key={field.key} role="group" aria-labelledby={labelId}>
          <div id={labelId} className="gh-portal-input-label">
            {field.name}
          </div>
          <div className="gh-portal-input-group">
            {addressRows(inputs).map((row) => (
              <div key={row[0].part} className="gh-portal-input-group-row">
                <InputForm fields={row} onChange={onChange} onKeyDown={onKeyDown} />
              </div>
            ))}
          </div>
        </section>
      );
    });
  }

  renderProfileData() {
    return (
      <div className="gh-portal-section">
        <InputForm
          fields={this.getInputFields({ state: this.state })}
          onChange={(e, field) => this.handleInputChange(e, field)}
          onKeyDown={(e, field) => this.onKeyDown(e, field)}
        />
        {this.renderCustomFields()}
      </div>
    );
  }

  render() {
    const { member } = this.context;
    if (!member) {
      return null;
    }
    return (
      <>
        <div className="gh-portal-content with-footer">
          {this.renderHeader()}
          <CloseButton />
          <div className="gh-portal-section">{this.renderProfileData()}</div>
        </div>
        {this.renderAccountFooter()}
      </>
    );
  }
}
