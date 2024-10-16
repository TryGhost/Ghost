import {useGlobalData} from '../components/providers/GlobalDataProvider';

const useFeatureFlag = (flag: string) => {
    const {config} = useGlobalData();

    return config.labs[flag] || false;
};

export default useFeatureFlag;
