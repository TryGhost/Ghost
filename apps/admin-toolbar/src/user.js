export function getUserLabel(user) {
    return user?.name || user?.email || 'Staff';
}

export function getUserImage(user) {
    return user?.profile_image || '';
}
