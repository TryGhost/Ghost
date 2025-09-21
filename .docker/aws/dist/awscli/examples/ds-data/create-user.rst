**To create a user**

The following ``create-user`` example creates a user in the specified directory. ::

    aws ds-data create-user \
        --directory-id d-1234567890 \
        --sam-account-name 'john.doe'

Output::

    {
        "DirectoryId": "d-1234567890",
        "SAMAccountName": "john.doe",
        "SID": "S-1-2-34-5567891234-5678912345-67891234567-8912"
    }

For more information, see `Creating an AWS Managed Microsoft AD user <https://docs.aws.amazon.com/directoryservice/latest/admin-guide/ms_ad_create_user.html>`__ in the *AWS Directory Service Administration Guide*.
