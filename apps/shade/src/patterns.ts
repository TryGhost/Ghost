// Feature-level compositions and pattern contracts
export * from './components/patterns/page-header';
export * from './components/patterns/view-bar';
export * from './components/patterns/filter-bar';
export * from './components/patterns/gh-chart';
export * from './components/patterns/kpi-card';
export * from './components/patterns/kpi-tabs';
export * from './components/patterns/filters';
export {
  DEFAULT_I18N,
  DEFAULT_OPERATORS,
  createFilter,
  createFilterGroup,
} from './components/patterns/filters-helpers';
export * from './components/patterns/dirty-confirm-dialog';
export { useDirtyConfirmation } from './components/patterns/use-dirty-confirmation';
export * from './components/patterns/image-upload';
export * from './components/patterns/image-upload-variants';
export * from './components/patterns/setting-group';
export * from './components/patterns/setting-group-variants';
export { default as ColorPicker } from './components/patterns/color-picker';
export {
  ColorPickerTrigger,
  ColorSwatch,
  ColorSwatchRow,
} from './components/patterns/color-picker';
export type {
  ColorPickerProps,
  ColorPickerTriggerProps,
  ColorSwatchOption,
  ColorSwatchProps,
  ColorSwatchRowProps,
} from './components/patterns/color-picker';
export { default as ShareModal } from './components/patterns/share-modal';
export type {
  ShareModalPreviewProps,
  ShareModalSocialLink,
} from './components/patterns/share-modal';
export { SettingsModal } from './components/patterns/settings-modal';
export { settingsModalVariants } from './components/patterns/settings-modal-variants';
export type { SettingsModalProps, SettingsModalSize } from './components/patterns/settings-modal';
