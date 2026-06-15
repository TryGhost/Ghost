/**
 * Email-suppression FAQ ("Why has my email been disabled?"). Ports Portal's
 * email-suppression-faq.js. Reached directly from an email-footer link
 * (#/portal/account/newsletters/disabled — no header), or with a back button to
 * the email-suppressed page when navigated internally.
 */

import {type ReactElement} from 'react';
import type {Services} from '../../../types';
import {BackButton} from '../../../shared/components/buttons/BackButton';
import {CloseButton} from '../../../shared/components/buttons/CloseButton';
import {getSupportAddress} from '../utils';

interface Props {
    services: Services;
    direct: boolean;
    onBack(): void;
    onClose(): void;
}

const BRANDED_BTN = 'gh:inline-flex gh:items-center gh:justify-center gh:rounded-md gh:px-4 gh:py-3 gh:text-[14px] gh:font-semibold gh:text-white gh:no-underline gh:bg-[var(--ghost-accent-color,#15171a)]';

export function EmailSuppressionFAQ({services, direct, onBack, onClose}: Props): ReactElement {
    const t = services.t;
    const site = services.getState().site;
    const supportHref = `mailto:${getSupportAddress(site)}`;

    return (
        <div className="gh:relative">
            {!direct && (
                <>
                    <BackButton onClick={onBack} t={t} />
                    <CloseButton onClick={onClose} t={t} />
                </>
            )}

            <div className="gh:flex gh:flex-col gh:gap-3 gh:text-[15px] gh:leading-relaxed gh:text-[#3d3d3d]">
                <h3 className="gh:m-0 gh:text-[20px] gh:font-bold gh:text-[#15171a]">{t('Why has my email been disabled?')}</h3>
                <p className="gh:m-0">{t('Newsletters can be disabled on your account for two reasons: A previous email was marked as spam, or attempting to send an email resulted in a permanent failure (bounce).')}</p>

                <h4 className="gh:m-0 gh:mt-2 gh:text-[15px] gh:font-semibold gh:text-[#15171a]">{t('Spam complaints')}</h4>
                <p className="gh:m-0">{t('If a newsletter is flagged as spam, emails are automatically disabled for that address to make sure you no longer receive any unwanted messages.')}</p>
                <p className="gh:m-0">{t('If the spam complaint was accidental, or you would like to begin receiving emails again, you can resubscribe to emails by clicking the button on the previous screen.')}</p>
                <p className="gh:m-0">{t('Once resubscribed, if you still don\'t see emails in your inbox, check your spam folder. Some inbox providers keep a record of previous spam complaints and will continue to flag emails. If this happens, mark the latest newsletter as \'Not spam\' to move it back to your primary inbox.')}</p>

                <h4 className="gh:m-0 gh:mt-2 gh:text-[15px] gh:font-semibold gh:text-[#15171a]">{t('Permanent failure (bounce)')}</h4>
                <p className="gh:m-0">{t('When an inbox fails to accept an email it is commonly called a bounce. In many cases, this can be temporary. However, in some cases, a bounced email can be returned as a permanent failure when an email address is invalid or non-existent.')}</p>
                <p className="gh:m-0">{t('In the event a permanent failure is received when attempting to send a newsletter, emails will be disabled on the account.')}</p>
                <p className="gh:m-0">{t('If you would like to start receiving emails again, the best next steps are to check your email address on file for any issues and then click resubscribe on the previous screen.')}</p>

                <p className="gh:m-0 gh:mt-2">
                    <a className={BRANDED_BTN} href={supportHref}>{t('Need more help? Contact support')}</a>
                </p>
            </div>
        </div>
    );
}
