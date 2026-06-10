import InputField from './input-field';
import {t} from '../../utils/i18n';

// POC: renders a single custom field's input by type (text/number via the
// shared InputField, boolean checkbox, select dropdown / multi checkboxes).
// onChange is called with the new value (not a DOM event). Shared by the signup
// and account-page surfaces.

// Native selects inherit `appearance: none` from .gh-portal-input, so draw our
// own chevron.
const SELECT_STYLE = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%238a8a8a' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 14px center',
    paddingRight: '36px'
};

function FieldError({message}) {
    if (!message) {
        return null;
    }
    return (
        <p style={{color: 'var(--red)', fontSize: '1.3rem', lineHeight: '1.6em', marginBottom: 0}}>
            {message}
        </p>
    );
}

export default function CustomFieldInput({field, value, errorMessage, placeholder, onKeyDown = () => {}, onChange}) {
    if (field.type === 'boolean') {
        return (
            <section className='gh-portal-input-section'>
                <label style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px'}}>
                    <input type='checkbox' name={field.id} checked={!!value} onChange={e => onChange(e.target.checked)} />
                    <span>{field.label}</span>
                </label>
                <FieldError message={errorMessage} />
            </section>
        );
    }

    if (field.type === 'select' && field.multiple) {
        const selected = Array.isArray(value) ? value : [];
        const toggle = option => onChange(selected.includes(option) ? selected.filter(o => o !== option) : [...selected, option]);
        return (
            <section className='gh-portal-input-section'>
                <div className='gh-portal-input-labelcontainer'>
                    <label className='gh-portal-input-label'>{field.label}</label>
                    <FieldError message={errorMessage} />
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px'}}>
                    {(field.options || []).map(option => (
                        <label key={option} style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                            <input type='checkbox' checked={selected.includes(option)} onChange={() => toggle(option)} />
                            <span>{option}</span>
                        </label>
                    ))}
                </div>
            </section>
        );
    }

    if (field.type === 'select') {
        return (
            <section className='gh-portal-input-section'>
                <div className='gh-portal-input-labelcontainer'>
                    <label className='gh-portal-input-label'>{field.label}</label>
                    <FieldError message={errorMessage} />
                </div>
                <select
                    className={errorMessage ? 'gh-portal-input error' : 'gh-portal-input'}
                    name={field.id}
                    value={value || ''}
                    style={value ? SELECT_STYLE : {...SELECT_STYLE, color: 'var(--grey8)'}}
                    onChange={e => onChange(e.target.value || null)}
                >
                    <option value=''>{placeholder || t('Select an option')}</option>
                    {(field.options || []).map(option => (
                        <option key={option} value={option}>{option}</option>
                    ))}
                </select>
            </section>
        );
    }

    return (
        <InputField
            label={field.label}
            type={field.type === 'number' ? 'number' : 'text'}
            name={field.id}
            value={value ?? ''}
            errorMessage={errorMessage}
            onKeyDown={onKeyDown}
            onChange={e => onChange(field.type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value)}
        />
    );
}
