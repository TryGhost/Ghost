**Example 1: To modify a snapshot attribute**

The following ``modify-snapshot-attribute`` example updates the ``createVolumePermission`` attribute for the specified snapshot, removing volume permissions for the specified user. ::

    aws ec2 modify-snapshot-attribute \
        --snapshot-id snap-1234567890abcdef0 \
        --attribute createVolumePermission \
        --operation-type remove \
        --user-ids 123456789012

**Example 2: To make a snapshot public**

The following ``modify-snapshot-attribute`` example makes the specified snapshot public. ::

    aws ec2 modify-snapshot-attribute \
        --snapshot-id snap-1234567890abcdef0 \
        --attribute createVolumePermission \
        --operation-type add \
        --group-names all
