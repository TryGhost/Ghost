**To search for a group in a directory**

The following ``search-groups`` example searches for the specified group in the specified directory. ::

    aws ds-data search-groups \
        --directory-id d-1234567890 \
        --search-attributes 'SamAccountName' \
        --search-string 'sales'

Output::

    {
        "Groups": [
            {
                "GroupScope": "Global",
                "GroupType": "Distribution",
                "SAMAccountName": "sales",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4567"
            }
        ],
        "DirectoryId": "d-1234567890",
        "Realm": "corp.example.com"
    }

For more information, see `Viewing and updating an AWS Managed Microsoft AD group's details <https://docs.aws.amazon.com/directoryservice/latest/admin-guide/ms_ad_view_update_group.html>`__ in the *AWS Directory Service Administration Guide*.
