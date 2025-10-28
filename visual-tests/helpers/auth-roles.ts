export interface UserRole {
    name: string;
    email: string;
    password: string;
    storageStatePath: string;
}

export const USER_ROLES = {
    admin: {
        name: 'Admin User',
        email: 'support@ghost.org',
        password: 'abc1234567',
        storageStatePath: '.auth/admin-storage-state.json'
    },
    // Add more user roles as needed:
    // editor: {
    //     name: 'Editor User',
    //     email: 'editor@ghost.org',
    //     password: 'abc1234567',
    //     storageStatePath: '.auth/editor-storage-state.json'
    // },
    // author: {
    //     name: 'Author User',
    //     email: 'author@ghost.org',
    //     password: 'abc1234567',
    //     storageStatePath: '.auth/author-storage-state.json'
    // }
} as const;

export type UserRoleKey = keyof typeof USER_ROLES;

export function getUserRole(role: UserRoleKey): UserRole {
    return USER_ROLES[role];
}
