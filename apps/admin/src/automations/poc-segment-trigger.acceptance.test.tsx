import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import {
  currentRoute,
  fakeAdminEndpoint,
  fakeAutomations,
  fakeMembers,
  renderAdminApp,
} from '@test-utils/acceptance';
import type { AutomationDetail } from '@tryghost/admin-x-framework/api/automations';
import { detail } from './run-history.test-utils';

// POC (poc/segments-ui) only: the mock "Member entered segment" trigger is a mark kept in the
// browser. It once leaked onto automations that were never made with it, which this guards.

const STORAGE_KEY = 'ghost-poc:segment-triggers:v2';
const labs = { automations: true, automationsLeadMagnets: true };
const button = (name: string) => page.getByRole('button', { name, exact: true });
const nameField = () => page.getByRole('textbox', { name: 'Automation name', exact: true });
const segmentTrigger = () =>
  page.getByText('Triggered when a member enters this segment:', { exact: true });
const freeSignupTrigger = () =>
  page.getByText('Triggered when someone signs up as a free member', { exact: true });
const chooserOption = (name: string) => page.getByRole('button').getByText(name, { exact: true });

const forgetMarks = () => window.localStorage.removeItem(STORAGE_KEY);

describe('Mock segment trigger', () => {
  beforeEach(forgetMarks);
  afterEach(forgetMarks);

  it('shows only on the automation made with it', async () => {
    fakeAutomations([]);
    fakeMembers([]);
    fakeAdminEndpoint('POST', '/automations/', ({ body }) => ({
      automations: [
        {
          ...detail('created'),
          ...(body as { automations: AutomationDetail[] }).automations[0],
          id: 'created',
        },
      ],
    }));
    fakeAdminEndpoint('GET', '/automations/other/', {
      automations: [{ ...detail('other'), name: 'Other automation' }],
    });

    // Made with the segment trigger: it shows as one before and after its first save.
    await renderAdminApp('/automations/new', { labs });
    await chooserOption('Member entered segment').click();
    await expect.element(segmentTrigger()).toBeVisible();
    await act(async () => {
      await button('Save').click();
      await expect.poll(currentRoute).toBe('/automations/created');
    });
    await expect.element(button('Save')).toBeDisabled();
    await expect.element(segmentTrigger()).toBeVisible();
    await expect.element(freeSignupTrigger()).not.toBeInTheDocument();

    // An automation that was already there keeps its own trigger.
    window.location.hash = '#/automations/other';
    await expect.element(nameField()).toHaveValue('Other automation');
    await expect.element(freeSignupTrigger()).toBeVisible();
    await expect.element(segmentTrigger()).not.toBeInTheDocument();

    // So does the next automation made with another trigger.
    window.location.hash = '#/automations/new';
    await chooserOption('Free member signed up').click();
    await expect.element(freeSignupTrigger()).toBeVisible();
    await expect.element(segmentTrigger()).not.toBeInTheDocument();
  });

  it('is dropped when a segment automation is abandoned before it is saved', async () => {
    fakeAutomations([]);
    fakeMembers([]);
    fakeAdminEndpoint('GET', '/automations/other/', {
      automations: [{ ...detail('other'), name: 'Other automation' }],
    });

    await renderAdminApp('/automations/new', { labs });
    await chooserOption('Member entered segment').click();
    await expect.element(segmentTrigger()).toBeVisible();

    // Opening an existing automation next was what once handed it the mark.
    window.location.hash = '#/automations/other';
    await expect.element(nameField()).toHaveValue('Other automation');
    await expect.element(freeSignupTrigger()).toBeVisible();
    await expect.element(segmentTrigger()).not.toBeInTheDocument();
  });
});
