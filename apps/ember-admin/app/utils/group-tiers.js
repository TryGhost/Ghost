// Groups tiers into the 'Active tiers' / 'Archived tiers' option groups used
// by every tier-picking power-select. `mapTier` converts each tier into the
// caller's option shape.
export function groupTiersByActive(tiers, mapTier = tier => tier) {
    const activeTiersGroup = {groupName: 'Active tiers', options: []};
    const archivedTiersGroup = {groupName: 'Archived tiers', options: []};

    tiers.forEach((tier) => {
        const group = tier.active ? activeTiersGroup : archivedTiersGroup;
        group.options.push(mapTier(tier));
    });

    return [activeTiersGroup, archivedTiersGroup];
}
