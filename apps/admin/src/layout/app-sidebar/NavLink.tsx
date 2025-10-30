import React from "react"
import { SidebarMenuButton, SidebarMenuItem } from "@tryghost/shade"
import { useBaseRoute } from "@tryghost/admin-x-framework"

interface NavLinkProps {
    label: string
    href: string
    className?: string
    children?: React.ReactNode
}

interface NavLinkComposition {
    Before: React.FC<{ children: React.ReactNode }>
    After: React.FC<{ children: React.ReactNode }>
    Icon: React.FC<{ children: React.ReactNode }>
}

// Define the slot components before the main component
const Before: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>
const After: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>
const Icon: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>

const NavLink: React.FC<NavLinkProps> & NavLinkComposition = ({ label, href, className, children }) => {
    const currentBaseRoute = useBaseRoute()

    // Determine if this link is active by comparing the base route
    // Strip hash prefix if present (e.g., "#/analytics" -> "/analytics")
    const normalizedHref = href.startsWith('#') ? href.slice(1) : href
    const linkBaseRoute = normalizedHref.split('/')[1]

    // Check if current base route matches this link's base route
    const isActive = currentBaseRoute === linkBaseRoute

    let before: React.ReactNode = null
    let after: React.ReactNode = null
    let icon: React.ReactNode = null

    React.Children.forEach(children, (child) => {
        if (React.isValidElement(child)) {
            if (child.type === Before) {
                before = (child.props as { children: React.ReactNode }).children
            } else if (child.type === After) {
                after = (child.props as { children: React.ReactNode }).children
            } else if (child.type === Icon) {
                icon = (child.props as { children: React.ReactNode }).children
            }
        }
    })

    return (
        <SidebarMenuItem className={className}>
            {before}
            <SidebarMenuButton asChild isActive={isActive}>
                <a href={href} aria-current={isActive ? 'page' : undefined}>
                    {icon}
                    <span>{label}</span>
                </a>
            </SidebarMenuButton>
            {after}
        </SidebarMenuItem>
    )
}

NavLink.Before = Before
NavLink.After = After
NavLink.Icon = Icon

export default NavLink
