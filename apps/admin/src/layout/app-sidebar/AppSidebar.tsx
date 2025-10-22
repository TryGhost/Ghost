import React from "react"

interface AppSidebarProps {
    children: React.ReactNode;
}

function AppSidebar({ ...props }: AppSidebarProps) {
    return (
        <div {...props}></div>
    )
}

export default AppSidebar;
