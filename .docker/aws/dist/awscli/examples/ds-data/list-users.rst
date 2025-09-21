**To list a directory's users**

The following ``list-users`` example lists users in the specified directory. ::

    aws ds-data list-users \
        --directory-id d-1234567890

Output::

    {
        "Users": [
            {
                "Enabled": true,
                "SAMAccountName": "Administrator",
                "SID": "S-1-2-34-5678910123-4567895012-3456789012-345"
            },
            {
                "Enabled": false,
                "SAMAccountName": "Guest",
                "SID": "S-1-2-34-5678910123-4567895012-3456789012-345"
            },
            {
                "Enabled": false,
                "SAMAccountName": "krbtgt",
                "SID": "S-1-2-34-5678910123-4567895012-3456789012-346"
            },
            {
                "Enabled": true,
                "SAMAccountName": "Admin",
                "SID": "S-1-2-34-5678910123-4567895012-3456789012-347"
            },
            {
                "Enabled": true,
                "SAMAccountName": "Richard Roe",
                "SID": "S-1-2-34-5678910123-4567895012-3456789012-348"
            },
            {
                "Enabled": true,
                "SAMAccountName": "Jane Doe",
                "SID": "S-1-2-34-5678910123-4567895012-3456789012-349"
            },
            {
                "Enabled": true,
                "SAMAccountName": "AWS_WGnzYlN6YyY",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4567"
            },
            {
                "Enabled": true,
                "SAMAccountName": "john.doe",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4568"
            }
        ],
        "DirectoryId": "d-1234567890",
        "Realm": "corp.example.com"
    }

For more information, see `Viewing and updating an AWS Managed Microsoft AD user <https://docs.aws.amazon.com/directoryservice/latest/admin-guide/ms_ad_view_update_user.html>`__ in the *AWS Directory Service Administration Guide*.
