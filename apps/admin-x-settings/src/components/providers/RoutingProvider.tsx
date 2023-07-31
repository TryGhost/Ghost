import ChangeThemeModal from "../settings/site/ThemeModal";
import DesignModal from "../settings/site/DesignModal";
import InviteUserModal from "../settings/general/InviteUserModal";
import NavigationModal from "../settings/site/NavigationModal";
import NiceModal from "@ebay/nice-modal-react";
import PortalModal from "../settings/membership/portal/PortalModal";
import React, { createContext, useCallback, useEffect, useState } from "react";
import StripeConnectModal from "../settings/membership/stripe/StripeConnectModal";
import TierDetailModal from "../settings/membership/tiers/TierDetailModal";

type RoutingContextProps = {
    route: string;
    scrolledRoute: string;
    yScroll: number;
    updateRoute: (newPath: string) => void;
    updateScrolled: (newPath: string) => void;
};

export const RouteContext = createContext<RoutingContextProps>({
    route: "",
    scrolledRoute: "",
    yScroll: 0,
    updateRoute: () => {},
    updateScrolled: () => {},
});

function getHashPath(urlPath: string | undefined) {
    if (!urlPath) {
        return null;
    }
    const regex = /\/settings-x\/(.*)/;
    const match = urlPath?.match(regex);

    if (match) {
        const afterSettingsX = match[1];
        return afterSettingsX;
    }
    return null;
}

const scrollToSectionGroup = (pathName: string) => {
    const element = document.getElementById(pathName);
    if (element) {
        element.scrollIntoView({ behavior: "smooth" });
    }
};

const handleNavigation = (scroll: boolean = true) => {
    // Get the hash from the URL
    let hash = window.location.hash;

    // Remove the leading '#' character from the hash
    hash = hash.substring(1);

    // Get the path name from the hash
    const pathName = getHashPath(hash);

    if (pathName) {
        if (pathName === "design/edit/themes") {
            NiceModal.show(ChangeThemeModal);
        } else if (pathName === "design/edit") {
            NiceModal.show(DesignModal);
        } else if (pathName === "navigation/edit") {
            NiceModal.show(NavigationModal);
        } else if (pathName === "users/invite") {
            NiceModal.show(InviteUserModal);
        } else if (pathName === "portal/edit") {
            NiceModal.show(PortalModal);
        } else if (pathName === "tiers/add") {
            NiceModal.show(TierDetailModal);
        } else if (pathName === "stripe-connect") {
            NiceModal.show(StripeConnectModal);
        }

        if (scroll) {
            scrollToSectionGroup(pathName);
        }

        return pathName;
    }
    return "";
};

type RouteProviderProps = {
    children: React.ReactNode;
};

const RoutingProvider: React.FC<RouteProviderProps> = ({ children }) => {
    const [route, setRoute] = useState<string>("");
    const [yScroll, setYScroll] = useState(0);
    const [scrolledRoute, setScrolledRoute] = useState<string>("");

    const updateRoute = useCallback(
        (newPath: string) => {
            if (newPath) {
                if (newPath === route) {
                    scrollToSectionGroup(newPath);
                } else {
                    window.location.hash = `/settings-x/${newPath}`;
                }
            } else {
                window.location.hash = `/settings-x`;
            }
        },
        [route]
    );

    const updateScrolled = useCallback((newPath: string) => {
        setScrolledRoute(newPath);
    }, []);

    useEffect(() => {
        const handleHashChange = () => {
            const matchedRoute = handleNavigation();
            setRoute(matchedRoute);
        };

        const handleScroll = () => {
            const element = document.getElementById("admin-x-root");
            const scrollPosition = element!.scrollTop;
            setYScroll(scrollPosition);
        };

        const element = document.getElementById("admin-x-root");
        const matchedRoute = handleNavigation();
        setRoute(matchedRoute);
        element!.addEventListener("scroll", handleScroll);

        window.addEventListener("hashchange", handleHashChange);

        return () => {
            element!.removeEventListener("scroll", handleScroll);
            window.removeEventListener("hashchange", handleHashChange);
        };
    }, []);

    return (
        <RouteContext.Provider
            value={{
                route,
                scrolledRoute,
                yScroll,
                updateRoute,
                updateScrolled,
            }}
        >
            {children}
        </RouteContext.Provider>
    );
};

export default RoutingProvider;
