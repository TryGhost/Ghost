import moment from 'moment-timezone';
import {Button} from '@tryghost/shade/components';
import {apiErrorMessage} from '@src/utils/api-error-message';
import {toast} from 'sonner';
import {useDeleteMemberSuppression} from '@tryghost/admin-x-framework/api/members';
import {useState} from 'react';
import type {Member} from '@tryghost/admin-x-framework/api/members';
import type {Newsletter} from '@tryghost/admin-x-framework/api/newsletters';

function NewsletterToggleRow({newsletter, subscribed, onToggle}: {
    newsletter: Newsletter;
    subscribed: boolean;
    onToggle: (id: string, isSubscribed: boolean) => void;
}) {
    const inputId = `${newsletter.id}-checkbox`;

    return (
        <div className="flex items-center justify-between border-b py-3 last:border-b-0">
            <h4 className="text-sm font-medium">{newsletter.name}</h4>
            <label className="cursor-pointer" htmlFor={inputId}>
                <input
                    checked={subscribed}
                    className="peer sr-only"
                    data-testid="member-subscription-checkbox"
                    id={inputId}
                    name="subscribed"
                    type="checkbox"
                    onChange={e => onToggle(newsletter.id, e.target.checked)}
                />
                <span
                    className="relative block h-5 w-9 rounded-full bg-muted-foreground/30 transition-colors peer-checked:bg-green after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-4"
                    data-testid="member-subscription-toggle"
                />
            </label>
        </div>
    );
}

/**
 * Newsletter subscription toggles plus the email suppression state, mirroring
 * the Ember Member::NewsletterPreference component.
 */
export function NewsletterPreferences({member, newsletters, subscribedIds, onChange}: {
    member?: Member;
    newsletters: Newsletter[];
    subscribedIds: string[];
    onChange: (ids: string[]) => void;
}) {
    const {mutateAsync: deleteSuppression} = useDeleteMemberSuppression();
    const [isReEnabling, setIsReEnabling] = useState(false);

    const suppression = member?.email_suppression;
    const suppressed = suppression?.suppressed === true;
    const suppressionReason = suppression?.info?.reason;
    const suppressionDate = suppression?.info?.timestamp
        ? moment(new Date(suppression.info.timestamp)).format('D MMM YYYY')
        : null;

    const handleToggle = (id: string, isSubscribed: boolean) => {
        if (isSubscribed) {
            onChange([...subscribedIds, id]);
        } else {
            onChange(subscribedIds.filter(existing => existing !== id));
        }
    };

    const handleReEnableEmail = async () => {
        if (!member) {
            return;
        }
        setIsReEnabling(true);
        try {
            await deleteSuppression({id: member.id});
            toast.success('Email re-enabled successfully');
        } catch (error) {
            toast.error(apiErrorMessage(error, 'Failed to re-enable email. Please try again.'));
        } finally {
            setIsReEnabling(false);
        }
    };

    return (
        <section className="mt-8">
            <h4 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">Newsletters</h4>
            <div className="rounded-lg border px-4 py-1">
                {!suppressed && newsletters.map(newsletter => (
                    <NewsletterToggleRow
                        key={newsletter.id}
                        newsletter={newsletter}
                        subscribed={subscribedIds.includes(newsletter.id)}
                        onToggle={handleToggle}
                    />
                ))}

                {suppressed ? (
                    <div className="flex flex-col items-center gap-2 py-8 text-center">
                        <h4 className="font-semibold">Email disabled</h4>
                        <p className="text-sm text-muted-foreground">
                            {suppressionReason === 'fail' && <>Bounced on {suppressionDate} </>}
                            {suppressionReason === 'spam' && <>Flagged as spam on {suppressionDate} </>}
                            <a className="underline" href="https://ghost.org/help/disabled-emails" rel="noopener noreferrer" target="_blank">Learn more</a>
                        </p>
                        <Button disabled={isReEnabling} type="button" onClick={handleReEnableEmail}>
                            Re-enable email
                        </Button>
                    </div>
                ) : (
                    <p className="py-3 text-xs text-muted-foreground">
                        If disabled, member will <em>not</em> receive newsletter emails
                    </p>
                )}
            </div>
        </section>
    );
}
