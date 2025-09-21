**To disable a user**

The following ``disable-user`` example disables the specified user in the specified directory. ::

    aws ds-data disable-user \
        --directory-id d-1234567890 \
        --sam-account-name 'john.doe'

This command produces no output.

For more information, see `Disabling an AWS Managed Microsoft AD user <https://docs.aws.amazon.com/directoryservice/latest/admin-guide/ms_ad_disable_user.html>`__ in the *AWS Directory Service Administration Guide*.
