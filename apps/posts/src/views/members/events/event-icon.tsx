import React from 'react';
import {LucideIcon} from '@tryghost/shade/utils';
import {cn} from '@tryghost/shade/utils';

type IconComponent = React.ComponentType<{className?: string}>;

/**
 * Maps the icon keys produced by parseMemberEvent (which mirror the Ember
 * admin's svg-jar icon names) to Lucide icons.
 */
const EVENT_ICONS: Record<string, IconComponent> = {
    'event-logged-in': LucideIcon.LogIn,
    'event-subscriptions': LucideIcon.CreditCard,
    'event-subscribed-to-email': LucideIcon.MailPlus,
    'event-unsubscribed-from-email': LucideIcon.MailMinus,
    'event-canceled-subscription': LucideIcon.CircleX,
    'event-signed-up': LucideIcon.UserPlus,
    'event-opened-email': LucideIcon.MailOpen,
    'event-sent-email': LucideIcon.Send,
    'event-received-email': LucideIcon.Mail,
    'event-email-delivery-failed': LucideIcon.MailWarning,
    'event-email-delivery-spam': LucideIcon.OctagonAlert,
    'event-comment': LucideIcon.MessageSquare,
    'event-click': LucideIcon.MousePointerClick,
    'event-more-like-this': LucideIcon.ThumbsUp,
    'event-less-like-this': LucideIcon.ThumbsDown,
    'event-gift': LucideIcon.Gift,
    'event-email-changed': LucideIcon.AtSign
};

export function EventIcon({icon, className}: {icon: string; className?: string}) {
    const Icon = EVENT_ICONS[icon] ?? LucideIcon.Activity;

    return (
        <span aria-hidden="true" className={cn('flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground', className)}>
            <Icon className="size-3.5" />
        </span>
    );
}
