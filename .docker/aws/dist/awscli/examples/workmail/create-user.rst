**To create a new user**

The following ``create-user`` command creates a new user. ::

    aws workmail create-user \
        --organization-id m-d281d0a2fd824be5b6cd3d3ce909fd27 \
        --name exampleName \
        --display-name exampleDisplayName \
        --password examplePa$$w0rd

Output::

    {
        "UserId": "S-1-1-11-1111111111-2222222222-3333333333-3333"
    }
