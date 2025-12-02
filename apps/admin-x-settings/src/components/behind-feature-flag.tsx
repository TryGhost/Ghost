import React, {type ReactNode} from 'react';
import useFeatureFlag from '../hooks/use-feature-flag';

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
