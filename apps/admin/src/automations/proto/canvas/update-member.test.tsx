import { beforeAll, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { UpdateMemberFields } from './update-member-fields';
import { stepKindOf, stepSubtitle, stepTitle } from './flow-utils';
import { laneOffersStep } from '@/automations/proto/shared/capabilities';
import { canPublishAutomation } from '@/automations/proto/shared/store';
import {
  type UpdateMemberAction,
  blankUpdateMemberData,
  insertUpdateMemberAction,
  updateMemberIncomplete,
} from '@/automations/proto/shared/update-member';
import { welcomeSeries } from '@/automations/proto/shared/mock/automations';
import { triggerConfigFor } from '@/automations/proto/shared/trigger-config';

const action = (data: Partial<UpdateMemberAction['data']> = {}): UpdateMemberAction => ({
  id: 'act_test',
  type: 'update_member',
  data: { ...blankUpdateMemberData(), ...data },
});

describe('update member step', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = () => {};
  });

  it('is incomplete until its operation has an argument', () => {
    // Labels and fields need one; unsubscribing is the operation that doesn't,
    // which is the whole reason it has no second field.
    expect(updateMemberIncomplete(action())).toBe(true);
    expect(updateMemberIncomplete(action({ label_id: 'seo-guide' }))).toBe(false);
    expect(updateMemberIncomplete(action({ operation: 'custom_field' }))).toBe(true);
    expect(
      updateMemberIncomplete(
        action({ operation: 'custom_field', field_id: 'favourite_topic', field_value: 'Tech' }),
      ),
    ).toBe(false);
    expect(updateMemberIncomplete(action({ operation: 'unsubscribe' }))).toBe(false);
  });

  it('reports its own kind', () => {
    // The card's icon and which body it renders both key off this. It shipped
    // wrong once — the canvas set `kind` with a two-way `isEmail ? 'email' :
    // 'wait'` while taking the title from stepTitle, so an Update member card
    // wore a clock and offered a wait duration.
    expect(stepKindOf(action())).toBe('update_member');
    expect(stepKindOf(welcomeSeries.actions[0])).toBe('email');
    expect(stepKindOf(welcomeSeries.actions[1])).toBe('wait');
  });

  it('describes itself as what will happen to the member', () => {
    expect(stepTitle(action())).toBe('Update member');
    expect(stepSubtitle(action({ label_id: 'seo-guide' }))).toBe('Add the label SEO guide');
    expect(stepSubtitle(action({ label_id: 'seo-guide', label_mode: 'remove' }))).toBe(
      'Remove the label SEO guide',
    );
    expect(stepSubtitle(action({ operation: 'unsubscribe' }))).toBe('Unsubscribe from all emails');
    expect(
      stepSubtitle(
        action({ operation: 'custom_field', field_id: 'onboarding_stage', field_value: 'Done' }),
      ),
    ).toBe('Set Onboarding stage to Done');
  });

  it('blocks publishing while a step is unfinished', () => {
    const withStep = {
      ...welcomeSeries,
      actions: [...welcomeSeries.actions, action()],
    };
    const trigger = triggerConfigFor('member_subscribes');
    expect(canPublishAutomation({ automation: withStep, trigger }, true)).toBe(false);
    expect(
      canPublishAutomation(
        {
          automation: {
            ...withStep,
            actions: [...welcomeSeries.actions, action({ label_id: 'seo-guide' })],
          },
          trigger,
        },
        true,
      ),
    ).toBe(true);
  });

  it('splices into the flow without disturbing the existing edges', () => {
    const [first, second] = welcomeSeries.actions;
    const next = insertUpdateMemberAction({
      detail: welcomeSeries,
      anchor: { previousActionId: first.id, nextActionId: second.id },
    });
    const added = next.actions.find((entry) => entry.type === 'update_member');
    expect(added).toBeTruthy();
    // The anchor's own edge is gone, replaced by two through the new step.
    expect(
      next.edges.some(
        (edge) => edge.source_action_id === first.id && edge.target_action_id === second.id,
      ),
    ).toBe(false);
    expect(
      next.edges.some(
        (edge) => edge.source_action_id === first.id && edge.target_action_id === added?.id,
      ),
    ).toBe(true);
    expect(
      next.edges.some(
        (edge) => edge.source_action_id === added?.id && edge.target_action_id === second.id,
      ),
    ).toBe(true);
    // Every other edge survives untouched.
    expect(next.edges.length).toBe(welcomeSeries.edges.length + 1);
  });

  it('is offered in future only', () => {
    expect(laneOffersStep('future', 'update_member')).toBe(true);
    expect(laneOffersStep('phase-1', 'update_member')).toBe(false);
    expect(laneOffersStep('phase-2', 'update_member')).toBe(false);
    expect(laneOffersStep('exploration', 'update_member')).toBe(false);
  });

  it('swaps its second field with the operation, and offers none for unsubscribe', () => {
    let data = blankUpdateMemberData();
    const { rerender } = render(
      <UpdateMemberFields
        data={data}
        onChange={(next) => {
          data = next;
          rerender(<UpdateMemberFields data={data} onChange={() => {}} />);
        }}
      />,
    );
    // Label is the default operation, so its picker is on screen.
    expect(screen.getByLabelText('Search labels')).toBeTruthy();
    expect(screen.queryByLabelText('Field value')).toBeNull();

    // Radix Select can't be driven in jsdom, so the operation is changed
    // through the handler the way the select would.
    rerender(
      <UpdateMemberFields data={{ ...data, operation: 'custom_field' }} onChange={() => {}} />,
    );
    expect(screen.getByLabelText('Field value')).toBeTruthy();
    expect(screen.queryByLabelText('Search labels')).toBeNull();

    rerender(
      <UpdateMemberFields data={{ ...data, operation: 'unsubscribe' }} onChange={() => {}} />,
    );
    expect(screen.queryByLabelText('Field value')).toBeNull();
    expect(screen.queryByLabelText('Search labels')).toBeNull();
    expect(screen.getByText(/Stops all email to this member/)).toBeTruthy();
  });

  it('creates a label from inside the step', () => {
    let data = blankUpdateMemberData();
    const { rerender } = render(
      <UpdateMemberFields
        data={data}
        onChange={(next) => {
          data = next;
          rerender(<UpdateMemberFields data={data} onChange={() => {}} />);
        }}
      />,
    );
    const input = screen.getByLabelText('Search labels');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'Read the welcome' } });
    fireEvent.click(screen.getByText('Create "Read the welcome"'));
    expect(data.label_id).toBe('read-the-welcome');
  });
});
