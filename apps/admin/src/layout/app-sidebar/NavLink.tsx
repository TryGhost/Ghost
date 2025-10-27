import React from "react"
import { LucideIcon, SidebarMenuButton, SidebarMenuItem } from "@tryghost/shade"

type IconName = keyof typeof LucideIcon

interface NavLinkProps {
    icon?: IconName
    label: string
    href: string
    className?: string
    children?: React.ReactNode
}

interface NavLinkComposition {
    Before: React.FC<{ children: React.ReactNode }>
    After: React.FC<{ children: React.ReactNode }>
}

// Define the slot components before the main component
const Before: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>
const After: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>

const NavLink: React.FC<NavLinkProps> & NavLinkComposition = ({ icon, label, href, className, children }) => {
    const Icon = icon ? (LucideIcon[icon] as React.ComponentType) : null

    let before: React.ReactNode = null
    let after: React.ReactNode = null

    React.Children.forEach(children, (child) => {
        if (React.isValidElement(child)) {
            if (child.type === Before) {
                before = (child.props as { children: React.ReactNode }).children
            } else if (child.type === After) {
                after = (child.props as { children: React.ReactNode }).children
            }
        }
    })

    return (
        <SidebarMenuItem className={className}>
            {before}
            <SidebarMenuButton asChild>
                <a href={href}>
                    {Icon && <Icon />}
                    <span>{label}</span>
                </a>
            </SidebarMenuButton>
            {after}
        </SidebarMenuItem>
    )
}

NavLink.Before = Before
NavLink.After = After

export default NavLink
