import {useGlobalData} from '@/settings/providers/global-data-context';

const useFeatureFlag = (flag: string) => {
    const {config} = useGlobalData();

    return config.labs[flag] || false;
};

export default useFeatureFlag;
