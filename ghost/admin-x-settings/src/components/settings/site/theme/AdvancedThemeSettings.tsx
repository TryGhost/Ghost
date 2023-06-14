import Button from '../../../../admin-x-ds/global/Button';
import Heading from '../../../../admin-x-ds/global/Heading';
import List from '../../../../admin-x-ds/global/List';
import ListItem from '../../../../admin-x-ds/global/ListItem';
import React from 'react';
import {Theme} from '../../../../types/api';
import {downloadFile, getGhostPaths} from '../../../../utils/helpers';
import {isActiveTheme, isDefaultTheme, isDeletableTheme} from '../../../../models/themes';
import {useApi} from '../../../providers/ServiceProvider';

interface ThemeActionProps {
    theme: Theme;
    themes: Theme[];
    updateThemes: (themes: Theme[]) => void;
}

interface ThemeSettingProps {
    themes: Theme[];
    setThemes: (themes: Theme[]) => void;
}

function getThemeLabel(theme: Theme): string {
    let label = theme.package?.name || theme.name;

    if (isDefaultTheme(theme)) {
        label += ' (default)';
    } else {
        label += ` (${theme.name})`;
    }

    if (isActiveTheme(theme)) {
        label += ' (active)';
    }

    return label;
}

function getThemeVersion(theme: Theme): string {
    return theme.package?.version || '1.0';
}

const ThemeActions: React.FC<ThemeActionProps> = ({
    theme,
    themes,
    updateThemes
}) => {
    const api = useApi();

    const handleActivate = async () => {
        const data = await api.themes.activate(theme.name);
        const updatedTheme = data.themes[0];

        const updatedThemes: Theme[] = themes.map((t) => {
            if (t.name === updatedTheme.name) {
                return updatedTheme;
            }
            return {
                ...t,
                active: false
            };
        });
        updateThemes(updatedThemes);
    };

    const handleDelete = async () => {
        await api.themes.delete(theme.name);
        const updatedThemes = themes.filter(t => t.name !== theme.name);
        updateThemes(updatedThemes);
    };

    const handleDownload = async () => {
        const {apiRoot} = getGhostPaths();
        downloadFile(`${apiRoot}/themes/${theme.name}/download`);
    };

    let actions = [];
    if (isDeletableTheme(theme)) {
        actions.push(
            <Button
                key='delete'
                color='red'
                label={'Delete'}
                link={true}
                onClick={handleDelete}
            />
        );
    }
    if (!isActiveTheme(theme)) {
        actions.push(
            <Button
                key='activate'
                className='ml-2'
                color='green'
                label={'Activate'}
                link={true}
                onClick={handleActivate}
            />
        );
    }

    actions.push(
        <Button
            key='download'
            className='ml-2'
            color='green'
            label={'Download'}
            link={true}
            onClick={handleDownload}
        />
    );

    return (
        <div className='flex gap-2'>
            {actions}
        </div>
    );
};

const ThemeList:React.FC<ThemeSettingProps> = ({
    themes,
    setThemes
}) => {
    return (
        <List
            title='Installed themes'
        >
            {themes.map((theme) => {
                const label = getThemeLabel(theme);
                const detail = getThemeVersion(theme);

                return (
                    <ListItem
                        key={theme.name}
                        action={
                            <ThemeActions
                                theme={theme}
                                themes={themes}
                                updateThemes={setThemes}
                            />
                        }
                        detail={detail}
                        id={`theme-${theme.name}`}
                        title={label}
                    />
                );
            })}
        </List>
    );
};

const AdvancedThemeSettings: React.FC<ThemeSettingProps> = ({
    themes,
    setThemes
}) => {
    return (
        <div className='p-[8vmin] pt-5'>
            <Heading>Installed themes</Heading>
            <div className='mt-5'>
                <ThemeList
                    setThemes={setThemes}
                    themes={themes}
                />
            </div>
        </div>
    );
};

export default AdvancedThemeSettings;