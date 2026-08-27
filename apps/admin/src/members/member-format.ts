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

// Avatar props for a member-shaped record: initials plus the hue seed
// (name-first, so distinct people keep distinct fallback colors). Spread onto
// Shade's <Avatar>; an absent member yields undefined props → icon fallback.
export const memberAvatarProps = (
  member?: { name?: string | null; email?: string | null } | null,
) => {
  if (!member || (!member.name && !member.email)) {
    return { initials: undefined, colorSeed: undefined };
  }
  return {
    initials: getMemberInitials(member),
    colorSeed: member.name || member.email || undefined,
  };
};
