import { useCallback, useMemo, useState } from "react";
import {
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@tryghost/shade/components";
import { getSettingValues, useBrowseSettings } from "@tryghost/admin-x-framework/api/settings";
import { useNavigate } from "@tryghost/admin-x-framework";

import { NavigationItemsEditor } from "./navigation-items-editor";
import { type NavigationItem, useNavigationEditor } from "./use-navigation-editor";
import { confirmIfDirty, useConfirmation } from "@/settings/app/shared/use-confirmation";
import { useSettingGroup } from "@/settings/app/shared/use-setting-group";

/**
 * The routed navigation dialog (`/settings/navigation/edit`), ported from
 * the legacy navigation-modal.tsx: primary/secondary tabs over the shared
 * settings form, validation on save, dirty-confirm on close.
 */

function NavigationDialogContent() {
    const navigate = useNavigate();
    const { confirm } = useConfirmation();
    const {
        localSettings,
        updateSetting,
        saveState,
        handleSave,
        siteData,
    } = useSettingGroup();

    const [navigationValue, secondaryNavigationValue] = getSettingValues<string>(
        localSettings,
        ["navigation", "secondary_navigation"],
    );
    const navigationItems = useMemo(() => JSON.parse(navigationValue || "[]") as NavigationItem[], [navigationValue]);
    const secondaryNavigationItems = useMemo(() => JSON.parse(secondaryNavigationValue || "[]") as NavigationItem[], [secondaryNavigationValue]);
    const setNavigationItems = useCallback((items: NavigationItem[]) => {
        updateSetting("navigation", JSON.stringify(items));
    }, [updateSetting]);
    const setSecondaryNavigationItems = useCallback((items: NavigationItem[]) => {
        updateSetting("secondary_navigation", JSON.stringify(items));
    }, [updateSetting]);

    const navigation = useNavigationEditor({
        items: navigationItems,
        setItems: setNavigationItems,
    });

    const secondaryNavigation = useNavigationEditor({
        items: secondaryNavigationItems,
        setItems: setSecondaryNavigationItems,
    });

    const [selectedTab, setSelectedTab] = useState("primary-nav");

    const dirty = localSettings.some((setting) => setting.dirty);

    const requestClose = () => {
        confirmIfDirty(confirm, dirty, () => navigate("/settings/navigation"));
    };

    const handleOk = async () => {
        if (navigation.validate() && secondaryNavigation.validate()) {
            await handleSave();
            navigate("/settings/navigation");
        }
    };

    if (!siteData) {
        return null;
    }

    return (
        <Dialog open onOpenChange={(open) => !open && requestClose()}>
            <DialogContent
                aria-describedby={undefined}
                className="flex max-h-[85vh] max-w-3xl flex-col gap-0"
                data-testid="navigation-modal"
            >
                <DialogTitle>Navigation</DialogTitle>
                <div className="mt-6 mb-1 min-h-0 grow overflow-y-auto">
                    <Tabs value={selectedTab} variant="underline" onValueChange={setSelectedTab}>
                        <TabsList>
                            <TabsTrigger value="primary-nav">Primary</TabsTrigger>
                            <TabsTrigger value="secondary-nav">Secondary</TabsTrigger>
                        </TabsList>
                        <TabsContent value="primary-nav"><NavigationItemsEditor baseUrl={siteData.url} navigation={navigation} /></TabsContent>
                        <TabsContent value="secondary-nav"><NavigationItemsEditor baseUrl={siteData.url} navigation={secondaryNavigation} /></TabsContent>
                    </Tabs>
                </div>
                <div className="mt-4 flex items-center justify-end gap-2 border-t border-border pt-4">
                    <Button disabled={saveState === "saving"} variant="outline" onClick={requestClose}>Close</Button>
                    <Button disabled={saveState === "saving"} variant="default" onClick={() => void handleOk()}>
                        {saveState === "saving" ? "Saving..." : "Save"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function NavigationDialog() {
    const { data: settingsData } = useBrowseSettings();

    if (!settingsData) {
        return null;
    }

    return <NavigationDialogContent />;
}
