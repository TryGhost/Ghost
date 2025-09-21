**To retrieve a list of groups**

The following ``list-groups`` command retrieves summaries of the groups in the specified organization. ::

    aws workmail list-groups \
        --organization-id m-d281d0a2fd824be5b6cd3d3ce909fd27

Output::

    {
        "Groups": [
            {
                "Id": "S-1-1-11-1122222222-2222233333-3333334444-4444",
                "Name": "exampleGroup1",
                "State": "DISABLED"
            },
            {
                "Id": "S-4-4-44-1122222222-2222233333-3333334444-4444",
                "Name": "exampleGroup2",
                "State": "ENABLED"
            }
        ]
    }
