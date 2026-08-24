// Display name for a member-shaped record, falling back from name to email
export const formatMemberName = (member: { name?: string | null; email?: string | null }) => {
  return (member.name && member.name.trim()) || member.email || 'Unknown Member';
};

// Uppercase initials for a member-shaped record, derived from formatMemberName
export const getMemberInitials = (member: { name?: string | null; email?: string | null }) => {
  const name = formatMemberName(member);
  const words = name.split(' ');
  if (words.length >= 2) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};
