**To list details of a group**

The following ``describe-group`` example gets information for the specified group in the specified directory. ::

    aws ds-data describe-group \
        --directory-id d-1234567890 \
        --sam-account-name 'sales'

Output::

    {
        "DirectoryId": "d-1234567890",
        "DistinguishedName": "CN=sales,OU=Users,OU=CORP,DC=corp,DC=example,DC=com",
        "GroupScope": "Global",
        "GroupType": "Security",
        "Realm": "corp.example.com",
        "SAMAccountName": "sales",
        "SID": "S-1-2-34-5567891234-5678912345-67891234567-8912"
    }

For more information, see `Viewing and updating an AWS Managed Microsoft AD group's details <https://docs.aws.amazon.com/directoryservice/latest/admin-guide/ms_ad_view_update_group.html>`__ in the *AWS Directory Service Administration Guide*.
