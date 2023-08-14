import React from 'react';

interface IntegrationHeaderProps {
    icon?: string;
    title?: React.ReactNode;
    detail?: React.ReactNode;
    extra?: React.ReactNode;
}

const IntegrationHeader: React.FC<IntegrationHeaderProps> = ({
    icon,
    title,
    detail,
    extra
}) => {
    return (
        <div>
            <div>{icon}</div>
            <div>{title}</div>
            <div>{detail}</div>
            <div>{extra}</div>
        </div>
    );
};

export default IntegrationHeader;