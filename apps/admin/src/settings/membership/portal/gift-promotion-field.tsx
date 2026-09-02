import React from 'react';
import { Field, FieldLabel, Switch } from '@tryghost/shade/components';
import {
  type Setting,
  type SettingValue,
  getSettingValue,
} from '@tryghost/admin-x-framework/api/settings';

type GiftPromotionSettingKey = 'portal_signup_gift_promotion' | 'portal_account_gift_promotion';

const GiftPromotionField: React.FC<{
  localSettings: Setting[];
  settingKey: GiftPromotionSettingKey;
  updateSetting: (key: string, setting: SettingValue) => void;
}> = ({ localSettings, settingKey, updateSetting }) => {
  const id = settingKey.replaceAll('_', '-');

  return (
    <Field orientation="horizontal">
      <FieldLabel htmlFor={id}>Display option to purchase gift</FieldLabel>
      <Switch
        checked={Boolean(getSettingValue(localSettings, settingKey))}
        id={id}
        onCheckedChange={(checked) => updateSetting(settingKey, checked)}
      />
    </Field>
  );
};

export default GiftPromotionField;
