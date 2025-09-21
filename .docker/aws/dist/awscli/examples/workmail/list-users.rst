**To retrieve a list of users**

The following ``list-users`` command retrieves summaries of the users in the specified organization. ::

    aws workmail list-users \
        --organization-id m-d281d0a2fd824be5b6cd3d3ce909fd27

Output::

    {
        "Users": [
            {
                "Id": "S-1-1-11-1111111111-2222222222-3333333333-3333",
                "Email": "exampleUser1@site.awsapps.com",
                "Name": "exampleUser1",
                "State": "ENABLED",
                "UserRole": "USER",
                "EnabledDate": 1532459261.827
            },
            {
                "Id": "S-1-1-11-1122222222-2222233333-3333334444-4444",
                "Name": "exampleGuestUser",
                "State": "DISABLED",
                "UserRole": "SYSTEM_USER"
            }
        ]
    }
