**To list the available widgets**

The following ``create-group`` example creates a group in a specified directory. ::

    aws ds-data create-group \
        --directory-id d-1234567890 \
        --sam-account-name "sales" 

Output::

    {
        "DirectoryId": "d-1234567890",
        "SAMAccountName": "sales",
        "SID": "S-1-2-34-5567891234-5678912345-67891234567-8912"
    }

For more information, see `Creating an AWS Managed Microsoft AD group <https://docs.aws.amazon.com/directoryservice/latest/admin-guide/ms_ad_create_group.html>`__ in the *AWS Directory Service Administration Guide*.
