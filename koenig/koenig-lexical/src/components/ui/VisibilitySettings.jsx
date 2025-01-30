import {DropdownSetting, ToggleSetting} from './SettingsPanel';

// original beta visibility settings updated to use alpha visibility format
export function VisibilitySettings({isStripeEnabled, updateVisibility, visibilityData}) {
    const webIsChecked = visibilityData.web.nonMembers && visibilityData.web.freeMembers && visibilityData.web.paidMembers;

    function toggleWeb() {
        const value = !webIsChecked;
        const newVisibilityData = structuredClone(visibilityData);
        newVisibilityData.web.nonMembers = value;
        newVisibilityData.web.freeMembers = value;
        newVisibilityData.web.paidMembers = value;
        updateVisibility(newVisibilityData);
    }

    const emailIsChecked = visibilityData.email.freeMembers || visibilityData.email.paidMembers;

    function toggleEmail() {
        const value = !emailIsChecked;
        const newVisibilityData = structuredClone(visibilityData);
        newVisibilityData.email.freeMembers = value;
        newVisibilityData.email.paidMembers = value;
        updateVisibility(newVisibilityData);
    }

    let emailSegment = '';
    if (visibilityData.email.freeMembers && visibilityData.email.paidMembers) {
        emailSegment = 'status:free,status:-free';
    } else if (visibilityData.email.freeMembers && !visibilityData.email.paidMembers) {
        emailSegment = 'status:free';
    } else if (!visibilityData.email.freeMembers && visibilityData.email.paidMembers) {
        emailSegment = 'status:-free';
    }

    const dropdownOptions = [{
        label: 'All members',
        name: 'status:free,status:-free'
    }, {
        label: 'Free members',
        name: 'status:free'
    }, {
        label: 'Paid members',
        name: 'status:-free'
    }];

    function toggleEmailSegment(segment) {
        const newVisibilityData = structuredClone(visibilityData);

        if (segment === 'status:free,status:-free') {
            newVisibilityData.email.freeMembers = true;
            newVisibilityData.email.paidMembers = true;
        } else if (segment === 'status:free') {
            newVisibilityData.email.freeMembers = true;
            newVisibilityData.email.paidMembers = false;
        } else if (segment === 'status:-free') {
            newVisibilityData.email.freeMembers = false;
            newVisibilityData.email.paidMembers = true;
        }

        updateVisibility(newVisibilityData);
    }

    return (
        <>
            <ToggleSetting
                dataTestId="visibility-show-on-web"
                isChecked={webIsChecked}
                label="Show on web"
                onChange={toggleWeb}
            />
            <ToggleSetting
                dataTestId="visibility-show-on-email"
                isChecked={emailIsChecked}
                label="Show in email newsletter"
                onChange={toggleEmail}
            />
            {emailIsChecked && isStripeEnabled && (
                <DropdownSetting
                    dataTestId="visibility-dropdown-segment"
                    label="Email audience"
                    menu={dropdownOptions}
                    value={emailSegment}
                    onChange={segment => toggleEmailSegment(segment)}
                />
            )}
        </>
    );
}

export function VisibilitySettingsAlpha({visibilityOptions, toggleVisibility}) {
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
