**To search for a user in a directory**

The following ``search-users`` example searches for the specified user in the specified directory. ::

    aws ds-data search-users \
        --directory-id d-1234567890 \
        --search-attributes 'SamAccountName' \
        --Search-string 'john.doe'

Output::

    {
        "Users": [
            {
                "Enabled": true,
                "SAMAccountName": "john.doe",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4567"
            }
        ],
        "DirectoryId": "d-1234567890",
        "Realm": "corp.example.com"
    }

For more information, see `Viewing and updating an AWS Managed Microsoft AD user <https://docs.aws.amazon.com/directoryservice/latest/admin-guide/ms_ad_view_update_user.html>`__ in the *AWS Directory Service Administration Guide*.
