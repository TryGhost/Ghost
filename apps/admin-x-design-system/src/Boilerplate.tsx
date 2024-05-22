import React from 'react';

interface BoilerPlateProps {
    children?: React.ReactNode;
}

const BoilerPlate: React.FC<BoilerPlateProps> = ({children}) => {
    return (
        <>
            {children}
        </>
    );
};

export default BoilerPlate;