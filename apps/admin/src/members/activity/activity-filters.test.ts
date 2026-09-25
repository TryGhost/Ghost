import { describe, expect, it } from 'vitest';
import {
  availableActivityTypes,
  activityQueryOptions,
  excludedActivityEvents,
  toggleActivityType,
} from './activity-filters';

describe('activity filters', () => {
  it('keeps email delivery events out of the global feed but available for one member', () => {
    const global = activityQueryOptions({ settings: {}, excluded: null }).excludedEvents;
    expect(global).toContain('email_opened_event');
    expect(global).toContain('email_complained_event');
    expect(global).not.toContain('automated_email_sent_event');
    expect(activityQueryOptions({ settings: {}, excluded: null, memberId: 'abc' })).toEqual({
      memberId: 'abc',
      excludedEvents: ['aggregated_click_event', 'metafield_change_event'],
    });
    expect(availableActivityTypes({}, 'abc').map(({ event }) => event)).toContain(
      'email_opened_event',
    );
    expect(availableActivityTypes({}).map(({ event }) => event)).not.toContain(
      'email_opened_event',
    );
  });

  it('excludes the backend complaint alias when the spam filter is switched off', () => {
    const filter = activityQueryOptions({
      settings: {},
      memberId: 'abc',
      excluded: 'email_complaint_event',
    }).excludedEvents;
    expect(filter).toContain('email_complaint_event');
    expect(filter).toContain('email_complained_event');
  });

  it('respects disabled newsletters and comments while retaining welcome email events', () => {
    const settings = { editorDefaultEmailRecipients: 'disabled', commentsEnabled: 'off' };
    const filter = activityQueryOptions({
      settings,
      excluded: null,
      memberId: 'abc',
    }).excludedEvents;
    expect(filter).toContain('newsletter_event');
    expect(filter).toContain('email_sent_event');
    expect(filter).toContain('comment_event');
    expect(filter).not.toContain('automated_email_sent_event');
    const available = availableActivityTypes(settings, 'abc').map(({ event }) => event);
    expect(available).not.toContain('newsletter_event');
    expect(available).not.toContain('comment_event');
    expect(available).not.toContain('click_event');
    expect(available).toContain('automated_email_sent_event');
    expect(availableActivityTypes({ emailTrackClicks: true }).map(({ event }) => event)).toContain(
      'click_event',
    );
  });

  it('offers custom field changes only where the site has custom fields', () => {
    const events = (settings: Parameters<typeof availableActivityTypes>[0]) =>
      availableActivityTypes(settings, 'abc').map(({ event }) => event);
    expect(events({ customFieldsAvailable: true })).toContain('metafield_change_event');
    expect(events({})).not.toContain('metafield_change_event');
    expect(
      activityQueryOptions({ settings: {}, excluded: null, memberId: 'abc' }).excludedEvents,
    ).toContain('metafield_change_event');
    expect(
      activityQueryOptions({
        settings: { customFieldsAvailable: true },
        excluded: null,
        memberId: 'abc',
      }).excludedEvents,
    ).not.toContain('metafield_change_event');
  });

  it.each([
    ['subscription_event', 'gift_redemption_event', 'gift_ended_event'],
    ['payment_event', 'donation_event', 'gift_purchase_event'],
  ])(
    'toggles the related events with %s without changing unrelated exclusions',
    (event, ...related) => {
      const excluded = toggleActivityType(event, 'login_event');
      expect(excludedActivityEvents(excluded)).toEqual(['login_event', event, ...related]);
      expect(toggleActivityType(event, excluded)).toBe('login_event');
    },
  );

  it('preserves valid unknown exclusions without accepting NQL from the URL', () => {
    expect(
      excludedActivityEvents('login_event,,future_event,login_event,]+type:signup_event'),
    ).toEqual(['login_event', 'future_event']);
    expect(
      activityQueryOptions({ settings: {}, excluded: 'future_event' }).excludedEvents,
    ).toContain('future_event');
  });
});
