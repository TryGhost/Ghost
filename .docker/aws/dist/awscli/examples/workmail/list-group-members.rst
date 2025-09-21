**To list group members**

The following ``list-group-members`` command lists the members of the specified group. ::

    aws workmail list-group-members \
        --organization-id m-d281d0a2fd824be5b6cd3d3ce909fd27 \
        --group-id S-1-1-11-1122222222-2222233333-3333334444-4444

Output::

    {
        "Members": [
            {
                "Id": "S-1-1-11-1111111111-2222222222-3333333333-3333",
                "Name": "exampleUser1",
                "Type": "USER",
                "State": "ENABLED",
                "EnabledDate": 1532459261.827
            }
        ]
    }
