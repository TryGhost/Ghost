import React, { useEffect, useId, useState } from 'react';
import { Button } from '@tryghost/shade/components';
import { Inline } from '@tryghost/shade/primitives';
import {
  SettingGroup,
  SettingGroupActions,
  SettingGroupDescription,
  SettingGroupDetails,
  SettingGroupHeader,
  SettingGroupTitle,
} from '@tryghost/shade/patterns';
import { createComponentId } from '@/settings/utils/search';
import { useSettingsNavigation } from '@/settings/hooks/use-settings-navigation';
import { useScrollSection, useScrollSectionContext } from '@/settings/hooks/use-scroll-section';
import { useOpenSectionRequest, useSearch } from '@/settings/providers/settings-app-context';
import { type SaveState } from '@tryghost/admin-x-framework/hooks';

interface TopLevelGroupProps {
  keywords: string[];
  navid?: string;
  testId?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  isEditing?: boolean;
  saveState?: SaveState;
  headerMedia?: React.ReactNode;
  customButtons?: React.ReactNode;
  beta?: boolean;
  children?: React.ReactNode;
  hideEditButton?: boolean;
  alwaysShowSaveButton?: boolean;
  saveDisabled?: boolean;
  highlightOnModalClose?: boolean;
  enableCMDS?: boolean;
  onEditingChange?: (isEditing: boolean) => void;
  /** Opens the section for an `?open` link, as its header button does. Defaults to Edit. */
  onOpen?: () => void;
  /** May be async; the group fires it without awaiting, so the handler owns its own error handling. */
  onSave?: () => void | Promise<unknown>;
  onCancel?: () => void;
}

const TopLevelGroup: React.FC<TopLevelGroupProps> = ({
  keywords,
  navid,
  testId,
  title,
  description,
  isEditing = false,
  saveState,
  headerMedia,
  customButtons,
  beta = false,
  children,
  hideEditButton,
  alwaysShowSaveButton = true,
  saveDisabled = false,
  highlightOnModalClose = true,
  enableCMDS = true,
  onEditingChange,
  onOpen,
  onSave,
  onCancel,
}) => {
  const { checkVisible, noResult, registerComponent, unregisterComponent } = useSearch();
  const { route } = useSettingsNavigation();
  const [highlight, setHighlight] = useState(false);
  const { ref } = useScrollSection(navid);
  const uniqueId = useId();
  const componentId = createComponentId(navid || 'component', uniqueId);

  useEffect(() => {
    registerComponent(componentId, keywords);
    return () => {
      unregisterComponent(componentId);
    };
  }, [componentId, keywords, registerComponent, unregisterComponent]);

  const { openSectionRequest, setOpenSectionRequest } = useOpenSectionRequest();
  const { jumpToSection } = useScrollSectionContext();
  const hasEditButton = !customButtons && Boolean(onEditingChange) && !hideEditButton;
  const open = onOpen ?? (hasEditButton ? () => onEditingChange?.(true) : undefined);

  useEffect(() => {
    if (!navid || openSectionRequest?.section !== navid) {
      return;
    }

    setOpenSectionRequest(undefined);
    jumpToSection(navid);
    open?.();
  }, [jumpToSection, navid, open, openSectionRequest, setOpenSectionRequest]);

  useEffect(() => {
    setHighlight(route === navid);
    if (route === navid) {
      const timer = setTimeout(() => setHighlight(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [route, navid]);

  useEffect(() => {
    const handleSaveShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault();
        if (!saveDisabled) {
          void onSave?.();
        }
      }
    };

    if (enableCMDS) {
      window.addEventListener('keydown', handleSaveShortcut);
      return () => window.removeEventListener('keydown', handleSaveShortcut);
    }
  }, [enableCMDS, onSave, saveDisabled]);

  const handleCancel = () => {
    onCancel?.();
    onEditingChange?.(false);
  };

  const buttons = isEditing ? (
    <Inline className="-mt-1.25" gap="sm">
      <Button size="sm" type="button" variant="ghost" onClick={handleCancel}>
        Cancel
      </Button>
      {(saveState === 'unsaved' || alwaysShowSaveButton) && (
        <Button
          disabled={saveState !== 'unsaved' || saveDisabled}
          size="sm"
          type="button"
          onClick={() => void onSave?.()}
        >
          {saveState === 'saving' ? 'Saving...' : 'Save'}
        </Button>
      )}
    </Inline>
  ) : !hideEditButton || saveState === 'saved' ? (
    <Button
      className="-mt-1.25 -mr-1"
      size="sm"
      type="button"
      variant="ghost"
      onClick={() => onEditingChange?.(true)}
    >
      {saveState === 'saved' ? 'Saved' : 'Edit'}
    </Button>
  ) : null;

  const hasImageChild = React.Children.toArray(children).some(
    (child) => React.isValidElement(child) && child.type === 'img',
  );

  const wrappedChildren = hasImageChild ? (
    <div className="-mx-5 -mb-5 overflow-hidden rounded-b-xl bg-muted md:-mx-7 md:-mb-7">
      {React.Children.map(children, (child) =>
        React.isValidElement<React.ImgHTMLAttributes<HTMLImageElement>>(child) &&
        child.type === 'img'
          ? React.cloneElement(child, {
              className: `${child.props.className || ''} h-full w-full rounded-b-xl`.trim(),
            })
          : child,
      )}
    </div>
  ) : (
    children
  );

  const isVisible = checkVisible(keywords) || noResult;

  return (
    <SettingGroup
      className={isVisible ? undefined : 'hidden'}
      data-testid={testId}
      editing={isEditing}
      highlighted={(highlight && highlightOnModalClose) || isEditing}
    >
      <div ref={ref} className="absolute" id={navid} />
      {headerMedia}
      {(title || description || customButtons || onEditingChange) && (
        <SettingGroupHeader>
          {(title || description) && (
            <SettingGroupDetails>
              {title && (
                <SettingGroupTitle>
                  {title}
                  {beta && (
                    <sup className="ml-0.5 text-[10px] font-semibold tracking-wide uppercase">
                      Beta
                    </sup>
                  )}
                </SettingGroupTitle>
              )}
              {description && <SettingGroupDescription>{description}</SettingGroupDescription>}
            </SettingGroupDetails>
          )}
          <SettingGroupActions>{customButtons || (onEditingChange && buttons)}</SettingGroupActions>
        </SettingGroupHeader>
      )}
      {wrappedChildren}
    </SettingGroup>
  );
};

export default TopLevelGroup;
