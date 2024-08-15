import KoenigComposerContext from '../../context/KoenigComposerContext.jsx';
import React from 'react';
import clsx from 'clsx';
import useSettingsPanelReposition from '../../hooks/useSettingsPanelReposition';
import {ButtonGroup} from './ButtonGroup';
import {ColorIndicator, ColorPicker} from './ColorPicker';
import {ColorOptionButtons} from './ColorOptionButtons';
import {Dropdown} from './Dropdown';
import {Input} from './Input';
import {InputList, InputListItem} from './InputList.jsx';
import {MediaUploader} from './MediaUploader';
import {MultiSelectDropdown} from './MultiSelectDropdown';
import {Slider} from './Slider.jsx';
import {Toggle} from './Toggle';

export function SettingsPanel({children, darkMode, cardWidth}) {
    const {ref} = useSettingsPanelReposition({}, cardWidth);

    return (
        // Ideally we would use Portal to avoid issues with transformed ancestors (https://bugs.chromium.org/p/chromium/issues/detail?id=20574)
        // However, Portal causes problems with drag/drop, focus, etc
        <div className={`!mt-0 touch-none ${darkMode ? 'dark' : ''}`}>
            <div ref={ref}
                className="not-kg-prose fixed left-0 top-0 z-[9999999] m-0 flex w-[320px] flex-col gap-2 rounded-lg bg-white bg-clip-padding p-6 font-sans shadow-lg will-change-transform dark:bg-grey-950 dark:shadow-xl"
                data-testid="settings-panel"
            >
                {children}
            </div>
        </div>
    );
}

export function ToggleSetting({label, description, isChecked, onChange, dataTestId}) {
    return (
        <label className="mt-2 flex min-h-[3rem] w-full items-center justify-between text-[1.3rem] first:mt-0">
            <div>
                <div className="font-bold text-grey-900 dark:text-grey-300">{label}</div>
                {description &&
                    <p className="w-11/12 text-[1.25rem] font-normal leading-snug text-grey-700">{description}</p>
                }
            </div>
            <div className="flex shrink-0 pl-2">
                <Toggle dataTestId={dataTestId} isChecked={isChecked} onChange={onChange} />
            </div>
        </label>
    );
}

export function SliderSetting({label, onChange, max, min, value, defaultValue, description, dataTestId}) {
    return (
        <div className="my-2 flex w-full flex-col gap-1">
            <div className="flex items-center justify-between font-sans text-[1.3rem] font-normal">
                <div className="font-bold text-grey-900 dark:text-grey-200">{label}</div>
                <div className="text-grey-900 dark:text-grey-100" data-testid={`${dataTestId}-value`}>{value}</div>
            </div>
            <Slider dataTestId={dataTestId} defaultValue={defaultValue} max={max} min={min} value={value} onChange={onChange} />
            {description &&
                <p className="mt-1 text-[1.25rem] font-normal leading-snug text-grey-700">{description}</p>
            }
        </div>
    );
}

export function InputSetting({label, hideLabel, description, onChange, value, placeholder, dataTestId, onBlur}) {
    return (
        <div className="mt-2 flex w-full flex-col justify-between gap-2 text-[1.3rem] first:mt-0">
            <div className={hideLabel ? 'sr-only' : 'font-bold text-grey-900 dark:text-grey-200'}>{label}</div>
            <Input dataTestId={dataTestId} placeholder={placeholder} value={value} onBlur={onBlur} onChange={onChange} />
            {description &&
                <p className="text-[1.25rem] font-normal leading-snug text-grey-700">{description}</p>
            }
        </div>
    );
}

/**
 * Enter a link with autocompletion
 */
export function InputUrlSetting({dataTestId, label, value, onChange}) {
    const {cardConfig} = React.useContext(KoenigComposerContext);
    const [listOptions, setListOptions] = React.useState([]);

    React.useEffect(() => {
        if (cardConfig?.fetchAutocompleteLinks) {
            cardConfig.fetchAutocompleteLinks().then((links) => {
                setListOptions(links.map((link) => {
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

/**
 * A text input with autocomplete suggestions.
 * @param {object} options
 * @param {(value: string) => void} options.onChange Does not pass an event, only the value
 * @param {{value: string, label: string}[]} options.listOptions
 * @returns
 */
export function InputListSetting({dataTestId, description, label, listOptions, onChange, placeholder, value}) {
    function onClick(item) {
        onChange(item.value);
    }

    const getItem = (item, selected, onMouseOver, scrollIntoView) => {
        return (
            <InputListItem
                key={item.value}
                className={clsx(
                    selected && 'bg-grey-100',
                    'cursor-pointer px-4 py-2 text-left hover:bg-grey-100 dark:hover:bg-black'
                )}
                dataTestId={dataTestId}
                item={item}
                scrollIntoView={scrollIntoView}
                selected={selected}
                onClick={onClick}
                onMouseOver={onMouseOver}
            >
                <span className="block text-sm font-semibold leading-tight text-black dark:text-white" data-testid={`${dataTestId}-listOption-${item.label}`}>{item.label}</span>
                <span className="block truncate text-xs leading-tight text-grey-700 dark:text-grey-600" data-testid={`${dataTestId}-listOption-${item.value}`}>
                    {item.value}
                </span>
            </InputListItem>
        );
    };

    return (
        <div className="mt-2 flex w-full flex-col justify-between gap-2 text-[1.3rem] first:mt-0">
            <div className="font-bold text-grey-900 dark:text-grey-200">{label}</div>
            <InputList
                dataTestId={dataTestId}
                getItem={getItem}
                listOptions={listOptions}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
            />
            {description &&
                <p className="text-[1.25rem] font-normal leading-snug text-grey-700">{description}</p>
            }
        </div>
    );
}

export function DropdownSetting({label, description, value, menu, onChange, dataTestId}) {
    return (
        <div className="mt-2 flex w-full flex-col justify-between gap-2 text-[1.3rem] first:mt-0">
            <div className="font-bold text-grey-900 dark:text-grey-200" data-testid={`${dataTestId}-label`}>{label}</div>
            <Dropdown
                dataTestId={dataTestId}
                menu={menu}
                value={value}
                onChange={onChange}
            />
            {description &&
                    <p className="text-[1.25rem] font-normal leading-snug text-grey-700">{description}</p>
            }
        </div>
    );
}

/**
 *
 * @param {object} options
 * @param {T[]} options.items The currently selected items
 * @param {T[]} options.availableItems The items available for selection
 * @param {boolean} options.allowAdd Whether to allow adding new items
 * @returns
 */
export function MultiSelectDropdownSetting({label, description, placeholder = '', items, availableItems, onChange, dataTestId, allowAdd = true}) {
    return (
        <div className="mt-2 flex w-full flex-col justify-between gap-2 text-[1.3rem] first:mt-0">
            <div className="font-bold text-grey-900 dark:text-grey-200">{label}</div>
            <MultiSelectDropdown
                allowAdd={allowAdd}
                availableItems={availableItems}
                dataTestId={dataTestId}
                items={items}
                placeholder={placeholder}
                onChange={onChange}
            />
            {description &&
                    <p className="text-[1.25rem] font-normal leading-snug text-grey-700">{description}</p>
            }
        </div>
    );
}

export function ButtonGroupSetting({label, onClick, selectedName, buttons}) {
    return (
        <div className="mt-2 flex w-full items-center justify-between text-[1.3rem] first:mt-0">
            <div className="font-bold text-grey-900 dark:text-grey-200">{label}</div>

            <div className="shrink-0 pl-2">
                <ButtonGroup buttons={buttons} selectedName={selectedName} onClick={onClick} />
            </div>
        </div>
    );
}

export function ColorOptionSetting({label, onClick, selectedName, buttons, layout, dataTestId}) {
    return (
        <div className={`mt-2 flex w-full text-[1.3rem] first:mt-0 ${layout === 'stacked' ? 'flex-col' : 'items-center justify-between'}`} data-testid={dataTestId}>
            <div className="font-bold text-grey-900 dark:text-grey-200">{label}</div>

            <div className={`shrink-0 ${layout === 'stacked' ? '-mx-1 pt-1' : 'pl-2'}`}>
                <ColorOptionButtons buttons={buttons} selectedName={selectedName} onClick={onClick} />
            </div>
        </div>
    );
}

export function ColorPickerSetting({label, isExpanded, onSwatchChange, onPickerChange, onTogglePicker, value, swatches, eyedropper, hasTransparentOption, dataTestId}) {
    const mappedPicker = (event) => {
        onTogglePicker(true);
    };

    const markClickedInside = (event) => {
        event.stopPropagation();
    };

    // Close on click outside
    React.useEffect(() => {
        if (isExpanded) {
            const closePicker = (event) => {
                onTogglePicker(false);
            };
            document.addEventListener('click', closePicker);

            return () => {
                document.removeEventListener('click', closePicker);
            };
        }
    }, [isExpanded]);

    return (
        <div className="mt-2 flex-col" data-testid={dataTestId} onClick={markClickedInside}>
            <div className="flex w-full items-center justify-between text-[1.3rem] first:mt-0">
                <div className="font-bold text-grey-900 dark:text-grey-200">{label}</div>

                <div className="shrink-0 pl-2">
                    <ColorIndicator
                        isExpanded={isExpanded}
                        swatches={swatches}
                        value={value}
                        onSwatchChange={onSwatchChange}
                        onTogglePicker={mappedPicker}
                    />
                </div>
            </div>
            {isExpanded && <ColorPicker eyedropper={eyedropper} hasTransparentOption={hasTransparentOption} value={value} onChange={onPickerChange} />}
        </div>
    );
}

export function MediaUploadSetting({className, label, hideLabel, onFileChange, isDraggedOver, placeholderRef, src, alt, isLoading, errors = [], progress, onRemoveMedia, icon, desc = '', size, borderStyle, mimeTypes, isPinturaEnabled, openImageEditor, setFileInputRef}) {
    return (
        <div className={clsx('mt-2 text-[1.3rem] first:mt-0', className)} data-testid="media-upload-setting">
            <div className={hideLabel ? 'sr-only' : 'font-bold text-grey-900 dark:text-grey-200'}>{label}</div>

            <MediaUploader
                alt={alt}
                borderStyle={borderStyle}
                className="h-32"
                desc={desc}
                dragHandler={{isDraggedOver, setRef: placeholderRef}}
                errors={errors}
                icon={icon}
                isLoading={isLoading}
                isPinturaEnabled={isPinturaEnabled}
                mimeTypes={mimeTypes}
                openImageEditor={openImageEditor}
                progress={progress}
                setFileInputRef={setFileInputRef}
                size={size}
                src={src}
                onFileChange={onFileChange}
                onRemoveMedia={onRemoveMedia}
            />
        </div>
    );
}

export function SettingsDivider() {
    return (
        <hr className="-mx-6 mt-2 border-grey-250 dark:border-white/5" />
    );
}
