import React, {Children, isValidElement, useId} from 'react';

export type BreadcrumbProps = {
    children: React.ReactNode
}

export type BreadcrumbItemProps = {
    children: React.ReactNode
    onClick?: () => void;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({children}) => {
    const id = useId();
    const items = Children.toArray(children);

    return (
        <div>
            {items.map((child, index) => {
                if (isValidElement(child)) {
                    return (
                        <span key={id}>
                            {child}
                            {index < items.length - 1 && <span>/</span>}
                        </span>
                    );
                }
                return child;
            })}
        </div>
    );
};

export const BreadcrumbItem: React.FC<BreadcrumbItemProps> = ({children, onClick}) => {
    return <span onClick={onClick}>{children}</span>;
};

export default Breadcrumb;
