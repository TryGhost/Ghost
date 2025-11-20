import React from "react";
import { SubmenuProvider } from "./SubmenuContext";

interface NavSubMenuProps {
    isExpanded: boolean;
    children: React.ReactNode;
    id?: string;
}

function NavSubMenu({ isExpanded, children, id }: NavSubMenuProps) {
    return (
        <SubmenuProvider>
            <div
                id={id}
                className={`grid transition-all duration-200 ease-out ${isExpanded ? 'grid-rows-[1fr] mb-5' : 'grid-rows-[0fr] mb-0'}`}
            >
                <div className="overflow-hidden">
                    {children}
                </div>
            </div>
        </SubmenuProvider>
    );
}

export default NavSubMenu;
