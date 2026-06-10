import React, {Fragment} from 'react';
import {Button, Popover, PopoverContent, PopoverTrigger, Separator} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {getAvailableEventTypes, needDivider, toggleEventType} from '../../events/member-event-types';
import type {MemberEventTypeSettings} from '../../events/member-event-types';

type IconComponent = React.ComponentType<{className?: string}>;

const TYPE_ICONS: Record<string, IconComponent> = {
    signup_event: LucideIcon.UserPlus,
    login_event: LucideIcon.LogIn,
    subscription_event: LucideIcon.CreditCard,
    payment_event: LucideIcon.DollarSign,
    newsletter_event: LucideIcon.MailPlus,
    email_opened_event: LucideIcon.MailOpen,
    email_delivered_event: LucideIcon.Mail,
    email_complaint_event: LucideIcon.OctagonAlert,
    email_failed_event: LucideIcon.MailWarning,
    email_change_event: LucideIcon.AtSign,
    automated_email_sent_event: LucideIcon.Send,
    feedback_event: LucideIcon.ThumbsUp,
    comment_event: LucideIcon.MessageSquare,
    click_event: LucideIcon.MousePointerClick
};

/**
 * The "Filter events" dropdown with a toggle per event type. Port of the
 * Ember MembersActivity::EventTypeFilter component.
 */
export function EventTypeFilter({excludedEvents, hiddenEvents, settings, onChange}: {
    /** comma-separated excluded events from the url */
    excludedEvents: string;
    hiddenEvents: string[];
    settings: MemberEventTypeSettings;
    onChange: (newExcludedEvents: string) => void;
}) {
    const excludedList = excludedEvents.split(',').filter(Boolean);
    const availableEventTypes = getAvailableEventTypes(settings, hiddenEvents);

    const eventTypes = availableEventTypes.map((type, i) => ({
        ...type,
        divider: needDivider(type, availableEventTypes[i - 1]),
        isSelected: !excludedList.includes(type.event)
    }));

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button data-testid="filter-events-button" variant="outline">
                    <LucideIcon.ListFilter className={`size-4 ${excludedEvents ? 'text-green' : ''}`} />
                    Filter events
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-1">
                <ul className="m-0 list-none p-0">
                    {eventTypes.map((type) => {
                        const Icon = TYPE_ICONS[type.event] ?? LucideIcon.Activity;
                        return (
                            <Fragment key={type.event}>
                                {type.divider && <Separator className="my-1" />}
                                <li className="flex items-center justify-between gap-2 rounded-sm px-2 py-1.5 hover:bg-accent">
                                    <span className="flex items-center gap-2 text-sm">
                                        <Icon className="size-4 text-muted-foreground" />
                                        {type.name}
                                    </span>
                                    <label className="cursor-pointer" data-testid={`event-type-filter-toggle-${type.event}`}>
                                        <input
                                            checked={type.isSelected}
                                            className="peer sr-only"
                                            name="eventTypes"
                                            type="checkbox"
                                            onChange={() => onChange(toggleEventType(type.event, excludedList))}
                                        />
                                        <span className="relative block h-4 w-7 rounded-full bg-muted-foreground/30 transition-colors peer-checked:bg-green after:absolute after:top-0.5 after:left-0.5 after:size-3 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-3" />
                                    </label>
                                </li>
                            </Fragment>
                        );
                    })}
                </ul>
            </PopoverContent>
        </Popover>
    );
}
