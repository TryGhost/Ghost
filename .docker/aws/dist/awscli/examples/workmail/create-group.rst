**To create a new group**

The following ``create-group`` command creates a new group for the specified organization. ::

    aws workmail create-group \
        --organization-id m-d281d0a2fd824be5b6cd3d3ce909fd27 \
        --name exampleGroup1

Output::

    {
        "GroupId": "S-1-1-11-1122222222-2222233333-3333334444-4444"
    }
