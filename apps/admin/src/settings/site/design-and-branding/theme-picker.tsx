import React from 'react';
import {
  Badge,
  Field,
  FieldDescription,
  FieldLabel,
  Link,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@tryghost/shade/components';
import { type Theme } from '@tryghost/admin-x-framework/api/themes';
import { getThemeDisplayName } from './theme-names';

/**
 * Which installed theme the Design settings show: the active one, or one to
 * try. Getting more themes (official ones, uploads) happens in Themes.
 */
const ThemePicker: React.FC<{
  themes: Theme[];
  value: string;
  /** The site's theme, named in the hint while another one is shown */
  activeTheme?: Theme;
  onChange: (name: string) => void;
  onBrowseThemes: () => void;
}> = ({ themes, value, activeTheme, onChange, onBrowseThemes }) => {
  const previewing = activeTheme && value !== activeTheme.name;

  return (
    <Field>
      {/* Picking a theme previews it (it isn't applied), and its settings follow below:
          the label names both, with the verbs Themes uses ("Preview Edition", "Customize Casper") */}
      <FieldLabel htmlFor="design-theme-picker">Preview and customize</FieldLabel>
      <Select disabled={themes.length < 2} value={value} onValueChange={onChange}>
        <SelectTrigger data-testid="design-theme-picker" id="design-theme-picker">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {themes.map((theme) => {
            const displayName = getThemeDisplayName(theme);
            // Two themes can share a package name (e.g. an edited copy); their folders differ
            const shared = themes.some(
              (other) => other !== theme && getThemeDisplayName(other) === displayName,
            );

            return (
              <SelectItem key={theme.name} value={theme.name}>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate">{displayName}</span>
                  {shared && <span className="truncate text-text-secondary">{theme.name}</span>}
                  {theme.active && <Badge variant="secondary">Active</Badge>}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      <FieldDescription>
        {previewing && (
          <>Your site still uses {getThemeDisplayName(activeTheme)} until you activate this one. </>
        )}
        Find more themes, or upload your own, in{' '}
        <Link asChild>
          <button data-testid="design-browse-themes" type="button" onClick={onBrowseThemes}>
            Themes
          </button>
        </Link>
        .
      </FieldDescription>
    </Field>
  );
};

export default ThemePicker;
