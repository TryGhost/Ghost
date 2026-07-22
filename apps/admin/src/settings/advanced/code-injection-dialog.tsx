import { useEffect, useRef, useState } from "react";
import { Button, Dialog, DialogContent, DialogTitle, Tabs, TabsContent, TabsList, TabsTrigger } from "@tryghost/shade/components";
import { getSettingValues } from "@tryghost/admin-x-framework/api/settings";

import { CodeEditor } from "./code-editor";
import { useSettingGroup } from "@/settings/app/shared/use-setting-group";

/**
 * The full-screen code injection editor, ported from the legacy
 * code/code-modal.tsx: site header/footer tabs with HTML CodeMirror editors,
 * Close/Save header buttons and Cmd/Ctrl+S. Opened from the Code injection
 * group (legacy shows it via NiceModal without a route, so it stays
 * state-driven here too).
 */
export function CodeInjectionDialog({ onClose }: { onClose: () => void }) {
    const { localSettings, saveState, handleSave, updateSetting } = useSettingGroup();

    const [headerContent, footerContent] = getSettingValues<string>(localSettings, ["codeinjection_head", "codeinjection_foot"]);
    const [selectedTab, setSelectedTab] = useState<"header" | "footer">("header");

    const saveLabel = saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : "Save";

    const handleSaveRef = useRef<() => void>(() => {});
    useEffect(() => {
        handleSaveRef.current = () => void handleSave({ fakeWhenUnchanged: true });
    });

    useEffect(() => {
        const handleCmdS = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                e.preventDefault();
                handleSaveRef.current();
            }
        };
        window.addEventListener("keydown", handleCmdS);
        return () => {
            window.removeEventListener("keydown", handleCmdS);
        };
    }, []);

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                className="top-0 left-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none p-8"
                data-testid="modal-code-injection"
                onInteractOutside={(event) => event.preventDefault()}
            >
                <div className="mb-4 flex shrink-0 items-center justify-between">
                    <DialogTitle className="text-2xl">Code injection</DialogTitle>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={onClose}>Close</Button>
                        <Button
                            className={saveState === "saved" ? "bg-state-success hover:bg-state-success" : undefined}
                            disabled={saveState === "saving"}
                            onClick={() => handleSaveRef.current()}
                        >
                            {saveLabel}
                        </Button>
                    </div>
                </div>
                <Tabs className="flex min-h-0 flex-auto flex-col" value={selectedTab} variant="underline" onValueChange={(value) => setSelectedTab(value as typeof selectedTab)}>
                    <TabsList className="shrink-0">
                        <TabsTrigger value="header">Site header</TabsTrigger>
                        <TabsTrigger value="footer">Site footer</TabsTrigger>
                    </TabsList>
                    {/* `hidden` + data-active flex: a bare `flex` class would override the
                        hidden attribute Radix leaves on the inactive content stub. */}
                    <TabsContent className="mt-2 hidden min-h-0 flex-auto flex-col data-[state=active]:flex" value="header">
                        <CodeEditor
                            hint="Code here will be injected into the {{ghost_head}} tag on every page of the site"
                            language="html"
                            testId="header-code"
                            value={headerContent || ""}
                            autoFocus
                            onChange={(value) => updateSetting("codeinjection_head", value)}
                        />
                    </TabsContent>
                    {/* `hidden` + data-active flex: a bare `flex` class would override the
                        hidden attribute Radix leaves on the inactive content stub. */}
                    <TabsContent className="mt-2 hidden min-h-0 flex-auto flex-col data-[state=active]:flex" value="footer">
                        <CodeEditor
                            hint="Code here will be injected into the {{ghost_foot}} tag on every page of the site"
                            language="html"
                            testId="footer-code"
                            value={footerContent || ""}
                            onChange={(value) => updateSetting("codeinjection_foot", value)}
                        />
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
