**To reset a user password in a directory**

The following ``reset-user-password`` example resets and enables the specified user in the specified directory. ::

    aws ds reset-user-password \
        --directory-id d-1234567890 \
        --user-name 'john.doe' \
        --new-password 'password'

This command produces no output.

For more information, see `Resetting and enabling an AWS Managed Microsoft AD user's password <https://docs.aws.amazon.com/directoryservice/latest/admin-guide/ms_ad_reset_user_pswd.html>`__ in the *AWS Directory Service Administration Guide*.
