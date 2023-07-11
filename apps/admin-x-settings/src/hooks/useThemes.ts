import {Theme} from '../types/api';
import {ThemesResponseType} from '../utils/api';
import {useApi} from '../components/providers/ServiceProvider';
import {useEffect, useState} from 'react';
import {useRequest} from './useRequest';

export function useThemes() {
    const api = useApi();
    const [themes, setThemes] = useState<Theme[]>([]);

    const {data, error, isLoading} = useRequest<ThemesResponseType>(api.themes.browse);

    useEffect(() => {
        if (data) {
            setThemes(data.themes);
        }
    }, [data]);

    return {
        themes,
        error,
        isLoading,
        setThemes
    };
}
