**To retrieve mailbox permissions**

The following ``list-mailbox-permissions`` command retrieves the mailbox permissions associated with the specified entity's mailbox. ::

    aws workmail list-mailbox-permissions \
        --organization-id m-d281d0a2fd824be5b6cd3d3ce909fd27 \
        --entity-id S-1-1-11-1111111111-2222222222-3333333333-3333

Output::

    {
        "Permissions": [
            {
                "GranteeId": "S-1-1-11-1122222222-2222233333-3333334444-4444",
                "GranteeType": "USER",
                "PermissionValues": [
                    "FULL_ACCESS"
                ]
            }
        ]
    }
