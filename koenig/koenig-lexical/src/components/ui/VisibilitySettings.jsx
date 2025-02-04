import {ToggleSetting} from './SettingsPanel';

export function VisibilitySettings({visibilityOptions, toggleVisibility}) {
    const settingGroups = visibilityOptions.map((group, index) => {
        const toggles = group.toggles.map((toggle) => {
            return (
                <ToggleSetting
                    key={toggle.key}
                    dataTestId={`visibility-toggle-${group.key}-${toggle.key}`}
                    isChecked={toggle.checked}
                    label={toggle.label}
                    onChange={() => toggleVisibility(group.key, toggle.key, !toggle.checked)}
                />
            );
        });

        return (
            <div key={group.key} className="flex flex-col gap-3">
                <p className="text-sm font-bold tracking-normal text-grey-900 dark:text-grey-300">{group.label}</p>
                {toggles}
                {index < visibilityOptions.length - 1 && (
                    <hr className="not-kg-prose my-2 block border-t-grey-300 dark:border-t-grey-900" />
                )}
            </div>
        );
    });

    return settingGroups;
}
