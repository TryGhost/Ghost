**To list aliases for a member**

The following ``list-aliases`` command lists aliases for the specified member (user or group). ::

    aws workmail list-aliases \
        --organization-id m-d281d0a2fd824be5b6cd3d3ce909fd27 \
        --entity-id S-1-1-11-1111111111-2222222222-3333333333-3333

Output::

    {
        "Aliases": [
            "exampleAlias@site.awsapps.com",
            "exampleAlias1@site.awsapps.com"
        ]
    }
