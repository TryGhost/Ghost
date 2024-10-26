import React, {ReactNode} from 'react';
import useFeatureFlag from '../hooks/useFeatureFlag';

type BehindFeatureFlagProps = {
    flag: string
    children: ReactNode
};
const BehindFeatureFlag: React.FC<BehindFeatureFlagProps> = ({flag, children}) => {
    const enabled = useFeatureFlag(flag);

    if (!enabled) {
        return null;
    }

    return <>{children}</>;
};

export default BehindFeatureFlag;
