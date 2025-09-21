**To list a directory's group members**

The following ``list-group-members`` example lists the group members for the specified group in the specified directory. ::

    aws ds-data list-group-members \
        --directory-id d-1234567890 \
        --sam-account-name 'sales'

Output::

    {
        "Members": [
            {
                "MemberType": "USER",
                "SAMAccountName": "Jane Doe",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4568"
            },
            {
                "MemberType": "USER",
                "SAMAccountName": "John Doe",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4569"
            }
        ],
        "DirectoryId": "d-1234567890",
        "MemberRealm": "corp.example.com",
        "Realm": "corp.example.com"
    }

For more information, see `Viewing and updating an AWS Managed Microsoft AD group's details <https://docs.aws.amazon.com/directoryservice/latest/admin-guide/ms_ad_view_update_group.html>`__ in the *AWS Directory Service Administration Guide*.
