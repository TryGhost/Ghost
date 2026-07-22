import { useEffect, useState } from "react";
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@tryghost/shade/components";
import { useCreateIntegration } from "@tryghost/admin-x-framework/api/integrations";
import { useNavigate } from "@tryghost/admin-x-framework";

import { TextField } from "@/settings/app/shared/text-field";
import { useConfirmation } from "@/settings/app/shared/use-confirmation";
import { useSettingsHandleError } from "@/settings/app/shared/toast";
import { HostLimitError, useLimiter } from "@/settings/app/shared/use-limiter";

/**
 * The routed create-integration dialog (`/settings/integrations/new`),
 * ported from the legacy add-integration-modal.tsx: name prompt guarded by
 * the customIntegrations host limit (limit modal + bounce back).
 */
export function AddIntegrationDialog() {
    const navigate = useNavigate();
    const { showLimit } = useConfirmation();
    const handleError = useSettingsHandleError();
    const limiter = useLimiter();

    const [name, setName] = useState("");
    const [errors, setErrors] = useState({ name: "" });
    const { mutateAsync: createIntegration } = useCreateIntegration();

    useEffect(() => {
        let cancelled = false;
        limiter.errorIfWouldGoOverLimit("customIntegrations").catch((error) => {
            if (cancelled) {
                return;
            }
            if (error instanceof HostLimitError) {
                showLimit({
                    prompt: error.message || "Your current plan doesn't support more custom integrations.",
                    onOk: () => navigate("/pro", { crossApp: true }),
                });
                navigate("/settings/integrations", { replace: true });
                return;
            }
            throw error;
        });
        return () => {
            cancelled = true;
        };
    }, [limiter, navigate, showLimit]);

    const handleAdd = async () => {
        if (!name) {
            setErrors({ name: "Name is required" });
            return;
        }

        try {
            const data = await createIntegration({ name });
            navigate(`/settings/integrations/${data.integrations[0].id}`);
        } catch (e) {
            handleError(e);
        }
    };

    return (
        <Dialog open onOpenChange={(open) => !open && navigate("/settings/integrations")}>
            <DialogContent className="max-w-[480px]" data-testid="add-integration-modal">
                <DialogHeader>
                    <DialogTitle>Add integration</DialogTitle>
                </DialogHeader>
                <TextField
                    error={Boolean(errors.name)}
                    hint={errors.name}
                    maxLength={191}
                    placeholder="Custom integration"
                    title="Name"
                    value={name}
                    autoFocus
                    onChange={(e) => {
                        setName(e.target.value);
                        if (errors.name) {
                            setErrors({ name: "" });
                        }
                    }}
                />
                <DialogFooter>
                    <Button variant="outline" onClick={() => navigate("/settings/integrations")}>Cancel</Button>
                    <Button onClick={() => void handleAdd()}>Add</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
