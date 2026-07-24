import { useEffect, useState } from "react";
import { Button, CopyField, CopyFieldActions, CopyFieldContent, CopyFieldCopyButton, CopyFieldValue } from "@tryghost/shade/components";
import { Stack } from "@tryghost/shade/primitives";
import { genStaffToken, getStaffToken } from "@tryghost/admin-x-framework/api/staff-token";

import { useConfirmation } from "@/settings/app/shared/use-confirmation";
import { useSettingsHandleError } from "@/settings/app/shared/toast";

export function StaffToken() {
    const { refetch: apiKey } = getStaffToken({ enabled: false });
    const handleError = useSettingsHandleError();
    const [token, setToken] = useState("");
    const { mutateAsync: newApiKey } = genStaffToken();
    const { confirm } = useConfirmation();

    useEffect(() => {
        const getApiKey = async () => {
            const newAPI = await apiKey();
            if (newAPI?.data?.apiKey) {
                setToken(`${newAPI.data.apiKey.id}:${newAPI.data.apiKey.secret}`);
            }
        };
        void getApiKey();
    }, [apiKey]);

    const genConfirmation = () => {
        confirm({
            title: "Regenerate your Staff Access Token",
            prompt: "You can regenerate your Staff Access Token any time, but any scripts or applications using it will need to be updated.",
            okLabel: "Regenerate your Staff Access Token",
            destructive: true,
            onOk: async () => {
                try {
                    const newAPI = await newApiKey([]);
                    setToken(`${newAPI.apiKey.id}:${newAPI.apiKey.secret}`);
                } catch (e) {
                    handleError(e);
                    throw e;
                }
            },
        });
    };

    return (
        <div>
            <h6 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Staff access token</h6>
            <Stack data-testid="api-keys" gap="none">
                <CopyField className="mb-3" data-testid="staff-access-token" value={token || ""}>
                    <CopyFieldContent>
                        <Stack className="min-w-0" gap="none">
                            <CopyFieldValue />
                        </Stack>
                        <CopyFieldActions>
                            <Button size="sm" type="button" variant="outline" onClick={genConfirmation}>Regenerate</Button>
                            <CopyFieldCopyButton />
                        </CopyFieldActions>
                    </CopyFieldContent>
                </CopyField>
            </Stack>
        </div>
    );
}
