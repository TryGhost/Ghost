import React from "react";

interface NavSubMenuProps {
    isExpanded: boolean;
    children: React.ReactNode;
    id?: string;
}

function NavSubMenu({ isExpanded, children, id }: NavSubMenuProps) {
    return (
        <div
            id={id}
            className={`grid transition-all duration-200 ease-out ${isExpanded ? 'mb-5 grid-rows-[1fr]' : 'mb-0 grid-rows-[0fr]'}`}
        >
            <div className="overflow-hidden">
                {children}
            </div>
        </div>
    );
}

export default NavSubMenu;
