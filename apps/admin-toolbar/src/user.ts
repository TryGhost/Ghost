export interface StaffRole {
  name: string;
}

export interface StaffUser {
  name?: string;
  email?: string;
  profile_image?: string | null;
  roles?: StaffRole[];
}

export function getUserLabel(user: StaffUser) {
  return user?.name || user?.email || 'Staff';
}

export function getUserImage(user: StaffUser) {
  return user?.profile_image || '';
}
