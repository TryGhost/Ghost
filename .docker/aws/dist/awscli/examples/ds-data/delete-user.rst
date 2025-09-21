**To delete a user**

The following ``delete-user`` example deletes the specified user from the specified directory. ::

    aws ds-data delete-user \
        --directory-id d-1234567890 \
        --sam-account-name 'john.doe'

This command produces no output.

For more information, see `Deleting an AWS Managed Microsoft AD user <https://docs.aws.amazon.com/directoryservice/latest/admin-guide/ms_ad_delete_user.html>`__ in the *AWS Directory Service Administration Guide*.
