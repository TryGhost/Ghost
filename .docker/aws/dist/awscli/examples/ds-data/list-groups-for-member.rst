**To list a directory's group membership**

The following ``list-groups-for-member`` example lists group membership for the specified user in the specified directory. ::

    aws ds-data list-groups-for-member \
        --directory-id d-1234567890 \
        --sam-account-name 'john.doe'

Output::

    {
        "Groups": [
            {
                "GroupScope": "Global",
                "GroupType": "Security",
                "SAMAccountName": "Domain Users",
                "SID": "S-1-2-34-5678901234-5678901234-5678910123-4567"
            }
        ],
        "DirectoryId": "d-1234567890",
        "MemberRealm": "corp.example.com",
        "Realm": "corp.example.com"
    }

For more information, see `Viewing and updating an AWS Managed Microsoft AD user <https://docs.aws.amazon.com/directoryservice/latest/admin-guide/ms_ad_view_update_user.html>`__ in the *AWS Directory Service Administration Guide*.
