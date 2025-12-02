import {useGlobalData} from '../components/providers/global-data-provider';

const useFeatureFlag = (flag: string) => {
    const {config} = useGlobalData();

    return config.labs[flag] || false;
};

export default useFeatureFlag;
