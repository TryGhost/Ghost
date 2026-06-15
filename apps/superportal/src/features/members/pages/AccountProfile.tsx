import {useState, type FormEvent, type ReactElement} from 'react';
import type {Services} from '../../../types';
import type {MembersApiClient} from '../../../shared/api-client';
import {cn} from '../../../shared/cn';
import {BackButton} from '../../../shared/components/buttons/BackButton';
import {warn} from '../../../shared/log';

interface Props {
    services: Services;
    api: MembersApiClient;
    onClose(): void;
    onBack(): void;
}

const PRIMARY_BTN = cn(
    'gh:flex gh:w-full gh:items-center gh:justify-center gh:gap-2',
    'gh:rounded-md gh:border-0 gh:px-4 gh:py-3 gh:text-[14px] gh:font-semibold gh:text-white gh:cursor-pointer',
    'gh:bg-[var(--ghost-accent-color,#15171a)] gh:disabled:opacity-60 gh:disabled:cursor-not-allowed'
);

const INPUT_CLS = 'gh:block gh:w-full gh:rounded-md gh:border gh:bg-white gh:px-3 gh:py-2.5 gh:text-[15px] gh:text-[#15171a] gh:outline-none';

const LABEL_CLS = 'gh:block gh:mb-1.5 gh:text-[13px] gh:font-medium gh:text-[#3d3d3d]';

export function AccountProfile({services, api, onBack}: Props): ReactElement {
    const t = services.t;
    const member = services.getState().member;

    const [name, setName] = useState(member?.name ?? '');
    const [email, setEmail] = useState(member?.email ?? '');
    const [emailError, setEmailError] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    if (!member) return <div />;

    const originalName = member.name ?? '';
    const originalEmail = member.email;
    const nameChanged = name.trim() !== originalName.trim();
    const emailChanged = email.trim().toLowerCase() !== originalEmail.toLowerCase();
    const dirty = nameChanged || emailChanged;

    function validate(): boolean {
        if (emailChanged && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            setEmailError(t('Invalid email address'));
            return false;
        }
        setEmailError('');
        return true;
    }

    async function handleSubmit(e: FormEvent): Promise<void> {
        e.preventDefault();
        if (!dirty || !validate()) return;
        setSaving(true);
        setError('');
        setSuccessMsg('');

        try {
            if (nameChanged) {
                await api.member.update({name: name.trim()});
                services.setMember({
                    id: member!.id,
                    uuid: member!.uuid,
                    email: member!.email,
                    name: name.trim(),
                    status: member!.status
                });
            }
            if (emailChanged) {
                await api.member.updateEmailAddress({email: email.trim()});
                setSuccessMsg(t('Check your inbox to verify email update'));
                return;
            }
            onBack();
        } catch (err) {
            setError(err instanceof Error ? err.message : t('Failed to update account details'));
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="gh:relative">
            <BackButton onClick={onBack} t={t} />

            <header className="gh:flex gh:flex-col gh:items-center gh:gap-2 gh:mb-6">
                <h1 className="gh:m-0 gh:text-center gh:text-[28px] gh:font-bold gh:leading-tight gh:text-[#15171a]">
                    {t('Account settings')}
                </h1>
            </header>

            {error && (
                <div className="gh:mb-4 gh:rounded-md gh:bg-[#fde7e7] gh:px-3 gh:py-2 gh:text-[14px] gh:text-[#a3160e]">
                    {error}
                </div>
            )}

            {successMsg && (
                <div className="gh:mb-4 gh:rounded-md gh:bg-[#e6f4ea] gh:px-3 gh:py-2 gh:text-[14px] gh:text-[#1b5e20]">
                    {successMsg}
                </div>
            )}

            <form onSubmit={(e) => { void handleSubmit(e).catch(err => warn('profile error', err)); }}>
                <div className="gh:mb-4">
                    <label htmlFor="sp-profile-name" className={LABEL_CLS}>{t('Name')}</label>
                    <input
                        id="sp-profile-name"
                        type="text"
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={cn(INPUT_CLS, 'gh:border-[#dadee2] gh:focus:border-[#a8adb4]')}
                    />
                </div>

                <div className="gh:mb-4">
                    <label htmlFor="sp-profile-email" className={LABEL_CLS}>{t('Email')}</label>
                    <input
                        id="sp-profile-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={cn(INPUT_CLS, emailError ? 'gh:border-[#e23a31]' : 'gh:border-[#dadee2] gh:focus:border-[#a8adb4]')}
                    />
                    {emailError && (
                        <p className="gh:m-0 gh:mt-1 gh:text-[12px] gh:text-[#e23a31]">{emailError}</p>
                    )}
                </div>

                <button type="submit" disabled={saving || !dirty} className={PRIMARY_BTN}>
                    {saving ? t('Sending...') : t('Save')}
                </button>
            </form>
        </div>
    );
}
