import KoenigComposerContext from '../../context/KoenigComposerContext';
import React from 'react';
import clsx from 'clsx';
import useSettingsPanelReposition from '../../hooks/useSettingsPanelReposition';
import {ButtonGroup} from './ButtonGroup';
import {ColorIndicator} from './ColorPicker';
import {ColorOptionButtons} from './ColorOptionButtons';
import {Dropdown} from './Dropdown';
import {Input} from './Input';
import {InputList, InputListItem} from './InputList';
import {MediaUploader} from './MediaUploader';
import {MultiSelectDropdown} from './MultiSelectDropdown';
import {Slider} from './Slider';
import {TabView} from './TabView';
import {Toggle} from './Toggle';
import type {OpenImageEditor} from '../../hooks/usePinturaEditor';

interface Tab {
    id: string;
    label: string;
}

export interface SettingsPanelProps {
    children?: React.ReactNode | Record<string, React.ReactNode>;
    darkMode?: boolean;
    cardWidth?: string;
    tabs?: Tab[];
    defaultTab?: string;
}

export function SettingsPanel({children, darkMode, cardWidth, tabs, defaultTab}: SettingsPanelProps) {
    const {ref} = useSettingsPanelReposition({}, cardWidth);

    const tabContent = React.useMemo(() => {
        if (!tabs) {
            return {default: children};
        }
        return typeof children === 'object' && children !== null ? children : {default: children};
    }, [tabs, children]);

    return (
        // Ideally we would use Portal to avoid issues with transformed ancestors (https://bugs.chromium.org/p/chromium/issues/detail?id=20574)
        // However, Portal causes problems with drag/drop, focus, etc
        <div className={`!mt-0 touch-none ${darkMode ? 'dark' : ''}`}>

            {tabs ? (
                <div ref={ref as React.RefObject<HTMLDivElement>}
                    className="not-kg-prose fixed left-0 top-0 z-[9999999] m-0 flex w-[320px] flex-col rounded-lg bg-white bg-clip-padding font-sans shadow-lg will-change-transform dark:bg-grey-950 dark:shadow-xl"
                    data-testid="settings-panel"
                    data-kg-settings-panel
                >
                    <TabView defaultTab={defaultTab} tabContent={tabContent as Record<string, React.ReactNode>} tabs={tabs} />
                </div>
            ) : (
                <div ref={ref as React.RefObject<HTMLDivElement>}
                    className="not-kg-prose fixed left-0 top-0 z-[9999999] m-0 flex w-[320px] flex-col gap-3 rounded-lg bg-white bg-clip-padding p-6 font-sans shadow-lg will-change-transform dark:bg-grey-950 dark:shadow-xl"
                    data-testid="settings-panel"
                    data-kg-settings-panel
                >{children as React.ReactNode}</div>
            )}
        </div>
    );
}

interface ToggleSettingProps {
    label: string;
    description?: string;
    isChecked?: boolean;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    dataTestId?: string;
}

export function ToggleSetting({label, description, isChecked, onChange, dataTestId}: ToggleSettingProps) {
    return (
        <label className="flex w-full cursor-pointer items-center justify-between">
            <div>
                <div className="text-sm font-medium tracking-normal text-grey-900 dark:text-grey-300">{label}</div>
                {description &&
                    <p className="mt-1 w-11/12 text-xs font-normal leading-snug text-grey-700 dark:text-grey-600">{description}</p>
                }
            </div>
            <div className="flex shrink-0 pl-2">
                <Toggle dataTestId={dataTestId} isChecked={isChecked} onChange={onChange} />
            </div>
        </label>
    );
}

interface SliderSettingProps {
    label: string;
    onChange?: (value: number) => void;
    max?: number;
    min?: number;
    value?: number;
    defaultValue?: number;
    description?: string;
    dataTestId?: string;
}

export function SliderSetting({label, onChange, max, min, value, defaultValue, description, dataTestId}: SliderSettingProps) {
    return (
        <div className="my-2 flex w-full flex-col gap-1">
            <div className="flex items-center justify-between font-sans text-[1.3rem] font-normal">
                <div className="text-sm font-medium tracking-normal text-grey-900 dark:text-grey-300">{label}</div>
                <div className="text-grey-900 dark:text-grey-100" data-testid={`${dataTestId}-value`}>{value}</div>
            </div>
            <Slider dataTestId={dataTestId} defaultValue={defaultValue} max={max} min={min} value={value} onChange={onChange} />
            {description &&
                <p className="mt-1 text-xs font-normal leading-snug text-grey-700 dark:text-grey-600">{description}</p>
            }
        </div>
    );
}

interface InputSettingProps {
    label: string;
    hideLabel?: boolean;
    description?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    value?: string;
    placeholder?: string;
    dataTestId?: string;
    onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
}

export function InputSetting({label, hideLabel, description, onChange, value, placeholder, dataTestId, onBlur}: InputSettingProps) {
    return (
        <div className="flex w-full flex-col justify-between">
            <div className={hideLabel ? 'sr-only' : 'mb-1.5 text-sm font-medium tracking-normal text-grey-900 dark:text-grey-300'}>{label}</div>
            <Input dataTestId={dataTestId} placeholder={placeholder} value={value} onBlur={onBlur} onChange={onChange} />
            {description &&
                <p className="text-xs font-normal leading-snug text-grey-700 dark:text-grey-600">{description}</p>
            }
        </div>
    );
}

interface InputUrlSettingProps {
    dataTestId?: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
}

export function InputUrlSetting({dataTestId, label, value, onChange}: InputUrlSettingProps) {
    const {cardConfig} = React.useContext(KoenigComposerContext);
    const [listOptions, setListOptions] = React.useState<{value: string; label: string}[]>([]);

    React.useEffect(() => {
        if (cardConfig?.fetchAutocompleteLinks) {
            cardConfig.fetchAutocompleteLinks().then((links: {value: string; label: string}[]) => {
                setListOptions(links.map((link: {value: string; label: string}) => {
                    return {value: link.value, label: link.label};
                }));
            });
        }
    }, [cardConfig]);

    const filteredSuggestedUrls = listOptions.filter((u) => {
        return u.label.toLocaleLowerCase().includes(value.toLocaleLowerCase());
    });

    return (
        <InputListSetting
            dataTestId={dataTestId}
            label={label}
            listOptions={filteredSuggestedUrls}
            placeholder='https://yoursite.com/#/portal/signup/'
            value={value}
            onChange={onChange}
        />
    );
}

interface InputListSettingProps {
    dataTestId?: string;
    description?: string;
    label: string;
    listOptions?: {value: string; label: string}[];
    onChange: (value: string) => void;
    placeholder?: string;
    value?: string;
}

export function InputListSetting({dataTestId, description, label, listOptions, onChange, placeholder, value}: InputListSettingProps) {
    function onClick(item: {value: string}) {
        onChange(item.value);
    }

    const getItem = (item: {value: string; label: string}, selected: boolean, onMouseOver?: () => void, scrollIntoView?: boolean) => {
        return (
            <InputListItem
                key={item.value}
                className={clsx(
                    selected && 'bg-grey-100 dark:bg-grey-925',
                    'm-0 cursor-pointer px-3 py-[7px] text-left hover:bg-grey-100 dark:hover:bg-grey-925'
                )}
                dataTestId={dataTestId}
                item={item}
                scrollIntoView={scrollIntoView}
                selected={selected}
                onClick={onClick}
                onMouseOver={onMouseOver}
            >
                <span className="block text-sm font-normal leading-tight text-black dark:text-white" data-testid={`${dataTestId}-listOption-${item.label}`}>{item.label}</span>
                <span className="block truncate text-xs leading-tight text-grey-700 dark:text-grey-600" data-testid={`${dataTestId}-listOption-${item.value}`}>
                    {item.value}
                </span>
            </InputListItem>
        );
    };

    return (
        <div className="flex w-full flex-col justify-between">
            <div className="text-sm font-medium tracking-normal text-grey-900 dark:text-grey-300">{label}</div>
            <InputList
                dataTestId={dataTestId}
                getItem={getItem}
                listOptions={listOptions}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
            />
            {description &&
                <p className="text-xs font-normal leading-snug text-grey-700 dark:text-grey-600">{description}</p>
            }
        </div>
    );
}

interface DropdownSettingProps {
    label: string;
    description?: string;
    value?: string;
    menu: {name: string; label: string}[];
    onChange: (name: string) => void;
    dataTestId?: string;
}

export function DropdownSetting({label, description, value, menu, onChange, dataTestId}: DropdownSettingProps) {
    return (
        <div className="flex w-full flex-col justify-between gap-1">
            <div className="text-sm font-medium tracking-normal text-grey-900 dark:text-grey-300" data-testid={`${dataTestId}-label`}>{label}</div>
            <Dropdown
                dataTestId={dataTestId}
                menu={menu}
                value={value}
                onChange={onChange}
            />
            {description &&
                    <p className="text-xs font-normal leading-snug text-grey-700 dark:text-grey-600">{description}</p>
            }
        </div>
    );
}

interface MultiSelectDropdownSettingProps {
    label: string;
    description?: string;
    placeholder?: string;
    items: string[];
    availableItems: string[];
    onChange: (items: string[]) => void;
    dataTestId?: string;
    allowAdd?: boolean;
}

export function MultiSelectDropdownSetting({label, description, placeholder = '', items, availableItems, onChange, dataTestId, allowAdd = true}: MultiSelectDropdownSettingProps) {
    return (
        <div className="flex w-full flex-col justify-between gap-1">
            <div className="text-sm font-medium tracking-normal text-grey-900 dark:text-grey-300">{label}</div>
            <MultiSelectDropdown
                allowAdd={allowAdd}
                availableItems={availableItems}
                dataTestId={dataTestId}
                items={items}
                placeholder={placeholder}
                onChange={onChange}
            />
            {description &&
                    <p className="text-xs font-normal leading-snug text-grey-700 dark:text-grey-600">{description}</p>
            }
        </div>
    );
}

interface ButtonGroupSettingProps {
    label: string;
    onClick: (name: string) => void;
    selectedName: string;
    buttons: {label?: string; name: string; Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>; dataTestId?: string; ariaLabel?: string}[];
    hasTooltip?: boolean;
}

export function ButtonGroupSetting({label, onClick, selectedName, buttons, hasTooltip}: ButtonGroupSettingProps) {
    return (
        <div className="flex w-full items-center justify-between text-[1.3rem]">
            <div className="text-sm font-medium tracking-normal text-grey-900 dark:text-grey-300">{label}</div>

            <div className="shrink-0 pl-2">
                <ButtonGroup buttons={buttons} hasTooltip={hasTooltip} selectedName={selectedName} onClick={onClick} />
            </div>
        </div>
    );
}

interface ColorOptionSettingProps {
    label: string;
    onClick: (name: string) => void;
    selectedName?: string;
    buttons: {label: string; name: string; color?: string}[];
    layout?: 'stacked' | string;
    dataTestId?: string;
}

export function ColorOptionSetting({label, onClick, selectedName, buttons, layout, dataTestId}: ColorOptionSettingProps) {
    return (
        <div className={`flex w-full text-[1.3rem] ${layout === 'stacked' ? 'flex-col' : 'items-center justify-between'}`} data-testid={dataTestId}>
            <div className="text-sm font-medium tracking-normal text-grey-900 dark:text-grey-300">{label}</div>

            <div className={`shrink-0 ${layout === 'stacked' ? '-mx-1 pt-[.6rem]' : 'pl-2'}`}>
                <ColorOptionButtons buttons={buttons} selectedName={selectedName} onClick={onClick} />
            </div>
        </div>
    );
}

interface ColorPickerSettingProps {
    label: string;
    isExpanded?: boolean;
    onSwatchChange: (value: string) => void;
    onPickerChange: (value: string) => void;
    onTogglePicker: (expanded: boolean) => void;
    value?: string;
    swatches: {hex?: string; accent?: boolean; transparent?: boolean; image?: boolean; title: string; customContent?: React.ReactNode}[];
    eyedropper?: boolean;
    hasTransparentOption?: boolean;
    dataTestId?: string;
    children?: React.ReactNode;
    showChildren?: boolean;
}

export function ColorPickerSetting({label, isExpanded, onSwatchChange, onPickerChange, onTogglePicker, value, swatches, eyedropper, hasTransparentOption, dataTestId, children, showChildren}: ColorPickerSettingProps) {
    const markClickedInside = (event: React.MouseEvent) => {
        event.stopPropagation();
    };
    const shouldRenderChildren = showChildren ?? true;

    return (
        <div className="flex-col" data-testid={dataTestId} onClick={markClickedInside}>
            <div className="flex w-full items-center justify-between text-[1.3rem]">
                <div className="text-sm font-medium tracking-normal text-grey-900 dark:text-grey-300">{label}</div>

                <div className="shrink-0 pl-2">
                    <ColorIndicator
                        eyedropper={eyedropper}
                        hasTransparentOption={hasTransparentOption}
                        isExpanded={isExpanded}
                        swatches={swatches}
                        value={value}
                        onChange={onPickerChange}
                        onSwatchChange={onSwatchChange}
                        onTogglePicker={onTogglePicker}
                    >
                        {shouldRenderChildren && children}
                    </ColorIndicator>
                </div>
            </div>
        </div>
    );
}

interface MediaUploadSettingProps {
    className?: string;
    imgClassName?: string;
    dataTestId?: string;
    label: string;
    hideLabel?: boolean;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isDraggedOver?: boolean;
    placeholderRef?: React.Ref<HTMLDivElement>;
    src?: string;
    alt?: string;
    isLoading?: boolean;
    errors?: {message: string}[];
    progress?: number;
    onRemoveMedia?: () => void;
    icon?: string;
    desc?: string;
    size?: string;
    type?: 'image' | 'button';
    stacked?: boolean;
    borderStyle?: 'squared' | 'rounded';
    mimeTypes?: string[];
    isPinturaEnabled?: boolean;
    openImageEditor?: OpenImageEditor;
    setFileInputRef?: (el: HTMLInputElement | null) => void;
}

export function MediaUploadSetting({className, imgClassName, label, hideLabel, onFileChange, isDraggedOver, placeholderRef, src, alt, isLoading, errors = [], progress, onRemoveMedia, icon, desc, size, type, stacked, borderStyle, mimeTypes, isPinturaEnabled, openImageEditor, setFileInputRef}: MediaUploadSettingProps) {
    return (
        <div className={clsx(className, !stacked && 'flex justify-between gap-3')} data-testid="media-upload-setting">
            <div className={hideLabel ? 'sr-only' : 'mb-2 shrink-0 text-sm font-medium tracking-normal text-grey-900 dark:text-grey-400'}>{label}</div>
            <MediaUploader
                alt={alt}
                borderStyle={borderStyle}
                className={clsx(
                    stacked && 'h-32',
                    !stacked && src && 'h-[5.2rem]',
                    !stacked && type !== 'button' && !src && 'h-[5.2rem] w-[7.2rem]'
                )}
                desc={desc}
                dragHandler={{isDraggedOver: isDraggedOver || false, setRef: placeholderRef as React.Ref<HTMLDivElement>}}
                errors={errors}
                icon={icon}
                imgClassName={imgClassName}
                isLoading={isLoading}
                isPinturaEnabled={isPinturaEnabled}
                mimeTypes={mimeTypes}
                openImageEditor={openImageEditor}
                progress={progress}
                setFileInputRef={setFileInputRef}
                size={size}
                src={src}
                type={type}
                onFileChange={onFileChange}
                onRemoveMedia={onRemoveMedia}
            />
        </div>
    );
}
