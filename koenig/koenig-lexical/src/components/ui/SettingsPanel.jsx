import ImageUploadForm from './ImageUploadForm';
import KoenigComposerContext from '../../context/KoenigComposerContext.jsx';
import React, {createContext, useContext, useEffect, useState} from 'react';
import useSettingsPanelReposition from '../../hooks/useSettingsPanelReposition';
import {ButtonGroup} from './ButtonGroup';
import {ColorIndicator, ColorPicker} from './ColorPicker';
import {ColorOptionButtons} from './ColorOptionButtons';
import {ReactComponent as DeleteIcon} from '../../assets/icons/kg-trash.svg';
import {Dropdown} from './Dropdown';
import {IconButton} from './IconButton';
import {Input} from './Input';
import {InputList} from './InputList';
import {MediaPlaceholder} from './MediaPlaceholder';
import {MultiSelectDropdown} from './MultiSelectDropdown';
import {ProgressBar} from './ProgressBar';
import {Toggle} from './Toggle';
import {openFileSelection} from '../../utils/openFileSelection';

const SettingsPanelContext = createContext();

export const useSettingsPanelContext = () => useContext(SettingsPanelContext);

export function SettingsPanel({children, darkMode}) {
    const {ref,repositionPanel} = useSettingsPanelReposition();

    return (
        // Ideally we would use Portal to avoid issues with transformed ancestors (https://bugs.chromium.org/p/chromium/issues/detail?id=20574)
        // However, Portal causes problems with drag/drop, focus, etc
        <SettingsPanelContext.Provider value={{repositionPanel}}>
            <div className={`!mt-0 ${darkMode ? 'dark' : ''}`}>
                <div ref={ref}
                    className="not-kg-prose z-[9999999] m-0 flex max-h-[520px] w-[320px] flex-col gap-2 overflow-auto rounded-lg bg-white bg-clip-padding p-6 font-sans shadow dark:bg-grey-950"
                    data-testid="settings-panel"
                >
                    {children}
                </div>
            </div>
        </SettingsPanelContext.Provider>
    );
}

export function ToggleSetting({label, description, isChecked, onChange, dataTestId}) {
    return (
        <div className="mt-2 flex min-h-[3rem] w-full items-center justify-between text-[1.3rem] first:mt-0">
            <div>
                <div className="font-bold text-grey-900 dark:text-grey-300">{label}</div>
                {description &&
                    <p className="w-11/12 text-[1.25rem] font-normal leading-snug text-grey-700">{description}</p>
                }
            </div>
            <div className="flex shrink-0 pl-2">
                <Toggle dataTestId={dataTestId} isChecked={isChecked} onChange={onChange} />
            </div>
        </div>
    );
}

export function InputSetting({label, hideLabel, description, onChange, value, placeholder, dataTestId}) {
    return (
        <div className="mt-2 flex w-full flex-col justify-between gap-2 text-[1.3rem] first:mt-0">
            <div className={hideLabel ? 'sr-only' : 'font-bold text-grey-900 dark:text-grey-200'}>{label}</div>
            <Input dataTestId={dataTestId} placeholder={placeholder} value={value} onChange={onChange} />
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
    return (
        <div className="mt-2 flex w-full flex-col justify-between gap-2 text-[1.3rem] first:mt-0">
            <div className="font-bold text-grey-900 dark:text-grey-200">{label}</div>
            <InputList dataTestId={dataTestId} listOptions={listOptions} placeholder={placeholder} value={value} onChange={onChange} />
            {description &&
                    <p className="text-[1.25rem] font-normal leading-snug text-grey-700">{description}</p>
            }
        </div>
    );
}

export function DropdownSetting({label, description, value, menu, onChange}) {
    return (
        <div className="mt-2 flex w-full flex-col justify-between gap-2 text-[1.3rem] first:mt-0">
            <div className="font-bold text-grey-900 dark:text-grey-200">{label}</div>
            <Dropdown
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

export function MultiSelectDropdownSetting({label, description, value, menu, onChange, dataTestId}) {
    return (
        <div className="mt-2 flex w-full flex-col justify-between gap-2 text-[1.3rem] first:mt-0">
            <div className="font-bold text-grey-900 dark:text-grey-200">{label}</div>
            <MultiSelectDropdown
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

export function ButtonGroupSetting({label, onClick, selectedName, buttons, dataTestId}) {
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

export function ColorPickerSetting({label, onChange, value, dataTestId}) {
    const [isExpanded, setExpanded] = useState(false);
    const {repositionPanel} = useSettingsPanelContext();

    useEffect(() => repositionPanel(), [repositionPanel, isExpanded]);

    return (
        <div className="mt-2 flex-col" data-testid={dataTestId}>
            <div className="flex w-full items-center justify-between text-[1.3rem] first:mt-0">
                <div className="font-bold text-grey-900 dark:text-grey-200">{label}</div>

                <div className="shrink-0 pl-2">
                    <ColorIndicator value={value} onClick={() => setExpanded(!isExpanded)} />
                </div>
            </div>
            {isExpanded && <ColorPicker value={value} onBlur={() => setExpanded(false)} onChange={onChange} />}
        </div>
    );
}

export function MediaUploadSetting({label, hideLabel, onFileChange, isDraggedOver, placeholderRef, src, alt, isLoading, dataTestId, errors = [], progress, onRemoveMedia, icon, desc = '', size, mimeTypes}) {
    const fileInputRef = React.useRef(null);

    const onFileInputRef = (element) => {
        fileInputRef.current = element;
    };

    const progressStyle = {
        width: `${progress?.toFixed(0)}%`
    };

    const onRemove = (e) => {
        e.stopPropagation(); // prevents card from losing selected state
        onRemoveMedia();
    };

    const isEmpty = !isLoading && !src;

    return (
        <div className="mt-2 text-[1.3rem] first:mt-0" data-testid="custom-thumbnail">
            <div className={hideLabel ? 'sr-only' : 'font-bold text-grey-900 dark:text-grey-200'}>{label}</div>

            {isEmpty &&
                <div className="h-32">
                    <MediaPlaceholder
                        borderStyle='dashed'
                        dataTestId="media-upload-placeholder"
                        desc={desc}
                        errorDataTestId="custom-thumbnails-errors"
                        errors={errors}
                        filePicker={() => openFileSelection({fileInputRef})}
                        icon={icon}
                        isDraggedOver={isDraggedOver}
                        placeholderRef={placeholderRef}
                        size={size}
                    />
                    <ImageUploadForm
                        fileInputRef={onFileInputRef}
                        filePicker={() => openFileSelection({fileInputRef})}
                        mimeTypes={mimeTypes}
                        onFileChange={onFileChange}
                    />
                </div>
            }

            {!isEmpty && (
                <div className="group relative flex h-32 items-center justify-center rounded" data-testid="media-upload-filled">
                    {src && (
                        <>
                            <img alt={alt} className="mx-auto h-full w-full rounded object-cover" src={src} />
                            <div className="absolute inset-0 rounded bg-gradient-to-t from-black/0 via-black/5 to-black/30 opacity-0 transition-all group-hover:opacity-100"></div>
                        </>
                    )}

                    {!isLoading && (
                        <div className="absolute top-2 right-2 flex opacity-0 transition-all group-hover:opacity-100">
                            <IconButton dataTestId={dataTestId} Icon={DeleteIcon} onClick={onRemove} />
                        </div>
                    )}

                    {isLoading && (
                        <div
                            className="absolute inset-0 flex min-w-full items-center justify-center overflow-hidden rounded border border-dashed border-grey/20 bg-grey-50"
                            data-testid="custom-thumbnail-progress"
                        >
                            <ProgressBar style={progressStyle} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export function SettingsDivider() {
    return (
        <hr className="-mx-6 mt-2 border-grey-200 dark:border-white/5" />
    );
}
