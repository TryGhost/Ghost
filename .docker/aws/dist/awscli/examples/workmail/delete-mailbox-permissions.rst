**To delete mailbox permissions**

The following ``delete-mailbox-permissions`` command deletes mailbox permissions that were previously granted to a user or group. The entity represents the user that owns the mailbox, and the grantee represents the user or group for whom to delete permissions. ::

    aws workmail delete-mailbox-permissions \
        --organization-id m-d281d0a2fd824be5b6cd3d3ce909fd27 \
        --entity-id S-1-1-11-1122222222-2222233333-3333334444-4444 \
        --grantee-id S-1-1-11-1111111111-2222222222-3333333333-3333

This command produces no output.
