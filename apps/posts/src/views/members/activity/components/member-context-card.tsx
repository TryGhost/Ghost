import {Avatar} from '@tryghost/shade/components';
import {Link} from '@tryghost/admin-x-framework';
import type {Member} from '@tryghost/admin-x-framework/api/members';

/**
 * The member summary card shown above the activity table when the activity is
 * filtered to one member. Port of the Ember gh-member-details-activity
 * component.
 */
export function MemberContextCard({member}: {member: Member}) {
    return (
        <div className="mb-6 flex items-center gap-4 rounded-lg border p-4">
            <Avatar
                className="size-14 text-lg"
                email={member.email}
                name={member.name ?? member.email ?? undefined}
                src={member.avatar_image}
            />
            <div className="min-w-0">
                <h3 className="truncate text-lg font-semibold">{member.name || member.email}</h3>
                {member.name && member.email && (
                    <p className="truncate text-sm text-muted-foreground">{member.email}</p>
                )}
                <p className="text-sm">
                    <Link className="font-medium text-green hover:underline" to={`/members/${member.id}`}>
                        View member profile &rarr;
                    </Link>
                </p>
            </div>
        </div>
    );
}
