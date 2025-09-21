**To retrieve information for a group**

The following ``describe-group`` command retrieves information about the specified group. ::

    aws workmail describe-group \
        --organization-id m-d281d0a2fd824be5b6cd3d3ce909fd27 \
        --group-id S-1-1-11-1122222222-2222233333-3333334444-4444

Output::

    {
        "GroupId": "S-1-1-11-1122222222-2222233333-3333334444-4444",
        "Name": "exampleGroup1",
        "State": "ENABLED"
    }
