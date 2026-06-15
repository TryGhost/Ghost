/**
 * Email-receiving FAQ ("Help! I'm not receiving emails"). Ports Portal's
 * email-receiving-faq.js — the canonical Interpolate page. Reached from the
 * "Not receiving emails?" footer (back to email prefs) or directly from an
 * email-footer link (#/portal/account/newsletters/help — no back button).
 */

import {type ReactElement} from 'react';
import type {Services} from '../../../types';
import {Interpolate} from '../../../shared/i18n/Interpolate';
import {BackButton} from '../../../shared/components/buttons/BackButton';
import {CloseButton} from '../../../shared/components/buttons/CloseButton';
import {getDefaultNewsletterSender, getSupportAddress} from '../utils';

interface Props {
    services: Services;
    direct: boolean;
    onBack(): void;
    onClose(): void;
    onEditProfile(): void;
}

const TEXT_BTN = 'gh:inline gh:border-0 gh:bg-transparent gh:p-0 gh:text-[var(--ghost-accent-color,#15171a)] gh:font-semibold gh:cursor-pointer gh:underline';

const bold = (text: string): ReactElement => <strong>{text}</strong>;

export function EmailReceivingFAQ({services, direct, onBack, onClose, onEditProfile}: Props): ReactElement {
    const t = services.t;
    const state = services.getState();
    const site = state.site;
    const memberEmail = state.member?.email ?? '';
    const senderEmail = getDefaultNewsletterSender(site);
    const supportEmail = getSupportAddress(site);
    const supportHref = `mailto:${supportEmail}`;

    return (
        <div className="gh:relative">
            {!direct && <BackButton onClick={onBack} t={t} />}
            <CloseButton onClick={onClose} t={t} />

            <div className="gh:flex gh:flex-col gh:gap-3 gh:text-[15px] gh:leading-relaxed gh:text-[#3d3d3d]">
                <h3 className="gh:m-0 gh:text-[20px] gh:font-bold gh:text-[#15171a]">{t('Help! I\'m not receiving emails')}</h3>

                <p className="gh:m-0">{t('If you\'re not receiving the email newsletter you\'ve subscribed to, here are a few things to check.')}</p>

                <h4 className="gh:m-0 gh:mt-2 gh:text-[15px] gh:font-semibold gh:text-[#15171a]">{t('Verify your email address is correct')}</h4>
                <p className="gh:m-0">
                    <Interpolate
                        string={t('The email address we have for you is {memberEmail} — if that\'s not correct, you can update it in your <button>account settings area</button>.')}
                        mapping={{
                            memberEmail: bold(memberEmail),
                            button: <button type="button" className={TEXT_BTN} onClick={onEditProfile} />
                        }}
                    />
                </p>

                <h4 className="gh:m-0 gh:mt-2 gh:text-[15px] gh:font-semibold gh:text-[#15171a]">{t('Check spam & promotions folders')}</h4>
                <p className="gh:m-0">{t('Make sure emails aren\'t accidentally ending up in the Spam or Promotions folders of your inbox. If they are, click on "Mark as not spam" and/or "Move to inbox".')}</p>

                <h4 className="gh:m-0 gh:mt-2 gh:text-[15px] gh:font-semibold gh:text-[#15171a]">{t('Create a new contact')}</h4>
                <p className="gh:m-0">
                    <Interpolate
                        string={t('In your email client add {senderEmail} to your contacts list. This signals to your mail provider that emails sent from this address should be trusted.')}
                        mapping={{senderEmail: bold(senderEmail)}}
                    />
                </p>

                <h4 className="gh:m-0 gh:mt-2 gh:text-[15px] gh:font-semibold gh:text-[#15171a]">{t('Send an email and say hi!')}</h4>
                <p className="gh:m-0">
                    <Interpolate
                        string={t('Send an email to {senderEmail} and say hello. This can also help signal to your mail provider that emails to and from this address should be trusted.')}
                        mapping={{senderEmail: bold(senderEmail)}}
                    />
                </p>

                <h4 className="gh:m-0 gh:mt-2 gh:text-[15px] gh:font-semibold gh:text-[#15171a]">{t('Check with your mail provider')}</h4>
                <p className="gh:m-0">
                    <Interpolate
                        string={t('If you have a corporate or government email account, reach out to your IT department and ask them to allow emails to be received from {senderEmail}')}
                        mapping={{senderEmail: bold(senderEmail)}}
                    />
                </p>

                <h4 className="gh:m-0 gh:mt-2 gh:text-[15px] gh:font-semibold gh:text-[#15171a]">{t('Get in touch for help')}</h4>
                <p className="gh:m-0">
                    <Interpolate
                        string={t('If you\'ve completed all these checks and you\'re still not receiving emails, you can reach out to get support by contacting {supportAddress}.')}
                        mapping={{supportAddress: <a href={supportHref} className="gh:text-[var(--ghost-accent-color,#15171a)] gh:underline">{supportEmail}</a>}}
                    />
                </p>
            </div>
        </div>
    );
}
