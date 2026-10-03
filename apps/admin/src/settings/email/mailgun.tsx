import React from 'react';
import TopLevelGroup from '@/settings/components/top-level-group';
import useSettingGroup from '@/settings/hooks/use-setting-group';
import {
  Field,
  FieldDescription,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@tryghost/shade/components';
import { Inline } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import {
  SettingGroupContent,
  SettingGroupValue,
  SettingGroupValueContent,
  SettingGroupValueTitle,
} from '@tryghost/shade/patterns';
import { getSettingValues } from '@tryghost/admin-x-framework/api/settings';
import { withErrorBoundary } from '@/settings/components/with-error-boundary';

const MAILGUN_REGIONS = [
  { label: '🇺🇸 US', value: 'https://api.mailgun.net/v3' },
  { label: '🇪🇺 EU', value: 'https://api.eu.mailgun.net/v3' },
];

const MailGun: React.FC<{ keywords: string[] }> = ({ keywords }) => {
  const {
    localSettings,
    isEditing,
    saveState,
    handleSave,
    handleCancel,
    updateSetting,
    handleEditingChange,
  } = useSettingGroup();

  const [mailgunRegion, mailgunDomain, mailgunApiKey] = getSettingValues(localSettings, [
    'mailgun_base_url',
    'mailgun_domain',
    'mailgun_api_key',
  ]) as string[];

  const isMailgunSetup = mailgunDomain && mailgunApiKey;

  // An unset region is shown as the default, so the first edit adds the default
  // to the group's changes and it is saved with them rather than staying null
  const updateMailgunSetting = (key: string, value: string) => {
    if (!mailgunRegion) {
      updateSetting('mailgun_base_url', MAILGUN_REGIONS[0].value);
    }
    updateSetting(key, value);
  };

  const values = (
    <SettingGroupContent>
      <SettingGroupValue>
        {!isMailgunSetup && <SettingGroupValueTitle>Status</SettingGroupValueTitle>}
        <SettingGroupValueContent className={!isMailgunSetup ? 'mt-1' : undefined}>
          {isMailgunSetup ? (
            <Inline align="center" gap="sm">
              <LucideIcon.Check className="size-4 text-state-success" />
              Mailgun is set up
            </Inline>
          ) : (
            'Mailgun is not set up'
          )}
        </SettingGroupValueContent>
      </SettingGroupValue>
    </SettingGroupContent>
  );

  const apiKeysHint = (
    <>
      Find your Mailgun API keys{' '}
      <a
        className="text-green hover:text-green-400"
        href="https://app.mailgun.com/settings/api_security"
        rel="noopener noreferrer"
        target="_blank"
      >
        here
      </a>
    </>
  );
  const inputs = (
    <SettingGroupContent>
      <div className="grid grid-cols-[120px_auto] gap-x-3 gap-y-6">
        <Field>
          <FieldLabel>Mailgun region</FieldLabel>
          <Select
            value={mailgunRegion || MAILGUN_REGIONS[0].value}
            onValueChange={(value) => updateMailgunSetting('mailgun_base_url', value)}
          >
            <SelectTrigger aria-label="Mailgun region">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MAILGUN_REGIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="mailgun-domain">Mailgun domain</FieldLabel>
          <Input
            id="mailgun-domain"
            value={mailgunDomain ?? ''}
            onChange={(e) => {
              updateMailgunSetting('mailgun_domain', e.target.value);
            }}
          />
        </Field>
        <div className="col-span-2">
          <Field>
            <FieldLabel htmlFor="mailgun-api-key">Mailgun private API key</FieldLabel>
            <Input
              id="mailgun-api-key"
              type="password"
              value={mailgunApiKey ?? ''}
              onChange={(e) => {
                updateMailgunSetting('mailgun_api_key', e.target.value);
              }}
            />
            <FieldDescription>{apiKeysHint}</FieldDescription>
          </Field>
        </div>
      </div>
    </SettingGroupContent>
  );

  const groupDescription = (
    <>
      The Mailgun API is used for bulk email newsletter delivery.{' '}
      <a
        className="text-green hover:text-green-400"
        href="https://docs.ghost.org/faq/mailgun-newsletters/"
        rel="noopener noreferrer"
        target="_blank"
      >
        Why is this required?
      </a>
    </>
  );

  return (
    <TopLevelGroup
      description={groupDescription}
      isEditing={isEditing}
      keywords={keywords}
      navid="mailgun"
      saveState={saveState}
      testId="mailgun"
      title="Mailgun"
      onCancel={handleCancel}
      onEditingChange={handleEditingChange}
      onSave={handleSave}
    >
      {isEditing ? inputs : values}
    </TopLevelGroup>
  );
};

export default withErrorBoundary(MailGun, 'Mailgun');
