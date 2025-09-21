**To list information for a user**

The following ``describe-user`` example gets information for the specified user in the specified directory. ::

    aws ds-data describe-user command-name \
        --directory-id d-1234567890 \
        --sam-account-name 'john.doe'

Output::

    {
        "DirectoryId": "d-1234567890",
        "DistinguishedName": "CN=john.doe,OU=Users,OU=CORP,DC=corp,DC=example,DC=com",
        "Enabled": false,
        "Realm": "corp.example.com",
        "SAMAccountName": "john.doe",
        "SID": "S-1-2-34-5678901234-5678901234-5678910123-4567",
        "UserPrincipalName": "john.doe@CORP.EXAMPLE.COM"
    }

For more information, see `Viewing and updating an AWS Managed Microsoft AD user <https://docs.aws.amazon.com/directoryservice/latest/admin-guide/ms_ad_view_update_user.html>`__ in the *AWS Directory Service Administration Guide*.
