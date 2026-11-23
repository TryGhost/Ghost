import React from 'react';
import { LucideIcon } from '@tryghost/shade/utils';
import type { FieldIcon } from './filter-providers';

// Total over `FieldIcon`, so naming an icon on a field is enough to make it render, and adding a
// name to the union fails to compile until there is something to draw for it.
export const FIELD_ICONS: Record<FieldIcon, React.ReactNode> = {
  arrows: React.createElement(LucideIcon.ArrowRightLeft, { className: 'size-4' }),
  calendar: React.createElement(LucideIcon.Calendar, { className: 'size-4' }),
  'calendar-clock': React.createElement(LucideIcon.CalendarClock, { className: 'size-4' }),
  'calendar-end': React.createElement(LucideIcon.CalendarArrowDown, { className: 'size-4' }),
  'calendar-start': React.createElement(LucideIcon.CalendarPlus, { className: 'size-4' }),
  card: React.createElement(LucideIcon.CreditCard, { className: 'size-4' }),
  click: React.createElement(LucideIcon.MousePointerClick, { className: 'size-4' }),
  eye: React.createElement(LucideIcon.Eye, { className: 'size-4' }),
  layers: React.createElement(LucideIcon.Layers, { className: 'size-4' }),
  mail: React.createElement(LucideIcon.Mail, { className: 'size-4' }),
  'mail-open': React.createElement(LucideIcon.MailOpen, { className: 'size-4' }),
  message: React.createElement(LucideIcon.MessageSquare, { className: 'size-4' }),
  newspaper: React.createElement(LucideIcon.Newspaper, { className: 'size-4' }),
  percent: React.createElement(LucideIcon.Percent, { className: 'size-4' }),
  person: React.createElement(LucideIcon.User, { className: 'size-4' }),
  'person-circle': React.createElement(LucideIcon.UserCircle, { className: 'size-4' }),
  'person-plus': React.createElement(LucideIcon.UserPlus, { className: 'size-4' }),
  send: React.createElement(LucideIcon.Send, { className: 'size-4' }),
  tag: React.createElement(LucideIcon.Tag, { className: 'size-4' }),
  text: React.createElement(LucideIcon.Type, { className: 'size-4' }),
  ticket: React.createElement(LucideIcon.Ticket, { className: 'size-4' }),
  circle: React.createElement(LucideIcon.Circle, { className: 'size-4' }),
  'file-text': React.createElement(LucideIcon.FileText, { className: 'size-4' }),
  flag: React.createElement(LucideIcon.Flag, { className: 'size-4' }),
  'message-text': React.createElement(LucideIcon.MessageSquareText, { className: 'size-4' }),
};
