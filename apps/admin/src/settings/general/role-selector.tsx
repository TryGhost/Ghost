import { Field, FieldDescription, FieldLabel, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@tryghost/shade/components";
import { type User, isOwnerUser } from "@tryghost/admin-x-framework/api/users";
import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";
import { useBrowseRoles } from "@tryghost/admin-x-framework/api/roles";

export function RoleSelector({ user, setUserData }: { user: User; setUserData: (user: User) => void }) {
    const { data: { roles } = {} } = useBrowseRoles();
    const { data: configData } = useBrowseConfig();
    const editorBeta = Boolean(configData?.config.labs?.superEditors);

    let optionsArray = [
        {
            hint: "Can write and edit their own posts, but cannot publish them.",
            label: "Contributor",
            value: "contributor",
        },
        {
            hint: "Can create, edit and publish their own posts, but can’t modify others.",
            label: "Author",
            value: "author",
        },
        {
            hint: "Can edit and publish any posts, and manage Authors and Contributors.",
            label: "Editor",
            value: "editor",
        },
        {
            hint: "Trusted user who has full access to all content, settings, and user management.",
            label: "Administrator",
            value: "administrator",
        },
    ];
    // if the editor beta is enabled, replace the editor role with super editor
    if (editorBeta) {
        optionsArray = optionsArray.map((option) => {
            if (option.value === "editor") {
                return {
                    ...option,
                    label: "Editor (beta mode)",
                    value: "super editor",
                    hint: "Can invite and manage other Authors and Contributors, as well as edit and publish any posts on the site. Can manage members and moderate comments.",
                };
            }
            return option;
        });
    }

    if (isOwnerUser(user)) {
        return (
            <Field data-disabled>
                <FieldLabel>Role</FieldLabel>
                <Select value="owner" disabled>
                    <SelectTrigger aria-label="Role"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="owner">Owner</SelectItem>
                    </SelectContent>
                </Select>
                <FieldDescription>
                    This user is the owner of the site. <a href="https://ghost.org/help/transfer-publication-ownership/" rel="noopener noreferrer" target="_blank">Transfer ownership</a> first to change their role.
                </FieldDescription>
            </Field>
        );
    }

    const selectedRoleValue = user.roles[0].name.toLowerCase();
    const selectedRoleLabel = optionsArray.find((option) => option.value.toLowerCase() === selectedRoleValue)?.label;

    return (
        <Field>
            <FieldLabel>Role</FieldLabel>
            <Select
                value={selectedRoleValue}
                onValueChange={(value) => {
                    const role = roles?.find((r) => r.name.toLowerCase() === value.toLowerCase());
                    if (role) {
                        setUserData({ ...user, roles: [role] });
                    }
                }}
            >
                <SelectTrigger aria-label="Role" data-testid="role-select"><SelectValue>{selectedRoleLabel}</SelectValue></SelectTrigger>
                <SelectContent>
                    {optionsArray.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            <span className="flex flex-col">
                                <span>{option.label}</span>
                                <span className="text-sm text-muted-foreground">{option.hint}</span>
                            </span>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </Field>
    );
}
