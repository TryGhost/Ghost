import React from "react";

interface NavSubMenuProps {
    isExpanded: boolean;
    children: React.ReactNode;
}

function NavSubMenu({ isExpanded, children }: NavSubMenuProps) {
    return (
        <div
            className={`grid transition-all duration-200 ease-out ${isExpanded ? 'grid-rows-[1fr] mb-5' : 'grid-rows-[0fr] mb-0'}`}
        >
            <div className="overflow-hidden">
                {children}
            </div>
        </div>
    );
}

export default NavSubMenu;
