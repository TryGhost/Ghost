import {
    fakeAdminEndpoint,
    fakeInvites,
    fakeRoles,
    fakeSettingsScreens,
    fakeUsers,
    staffInvite,
    staffRole,
    staffUser,
    type StaffInvite,
    type StaffRole,
    type StaffRoleName,
    type StaffUser,
} from "@test-utils/acceptance";

const ROLE_IDS: Record<StaffRoleName, string> = {
    Owner: "role-owner",
    Administrator: "role-administrator",
    Editor: "role-editor",
    "Super Editor": "role-super-editor",
    Author: "role-author",
    Contributor: "role-contributor",
};

export function role(name: StaffRoleName): StaffRole {
    return staffRole({
        id: ROLE_IDS[name],
        name,
        description: name === "Owner" ? "Blog Owner" : `${name}s`,
    });
}

export function user(name: StaffRoleName, overrides: Partial<StaffUser> = {}): StaffUser {
    const slug = name.toLowerCase().replace(" ", "-");
    return staffUser({
        id: `user${slug.replace("-", "")}`,
        name: `${name} User`,
        slug,
        email: `${slug}@test.com`,
        roles: [role(name)],
        ...overrides,
    });
}

export function invite(overrides: Partial<StaffInvite> = {}): StaffInvite {
    return staffInvite({role_id: ROLE_IDS.Author, email: "invitee@test.com", ...overrides});
}

export const allRoles = (): StaffRole[] => [
    role("Administrator"),
    role("Editor"),
    role("Author"),
    role("Contributor"),
    role("Owner"),
];

export interface FakeStaffWorldOptions {
    currentUser?: StaffUser;
    users?: StaffUser[];
    invites?: StaffInvite[];
    roles?: StaffRole[];
}

export function fakeStaffWorld({
    currentUser = user("Owner"),
    users = [currentUser],
    invites = [],
    roles = allRoles(),
}: FakeStaffWorldOptions = {}) {
    fakeSettingsScreens();
    fakeUsers(users);
    fakeInvites(invites);
    fakeRoles(roles);
    fakeAdminEndpoint("GET", "/users/me/token/", {apiKey: null});

    for (const staffUser of users) {
        fakeAdminEndpoint("GET", `/users/slug/${staffUser.slug}/?include=roles`, {users: [staffUser]});
    }

    return {
        boot: {browseMe: {response: {users: [currentUser]}}},
        currentUser,
        users,
        invites,
        roles,
    };
}
