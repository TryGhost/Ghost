**To delete a password for an IAM user**

The following ``delete-login-profile`` command deletes the password for the IAM user named ``Bob``. ::

    aws iam delete-login-profile \
        --user-name Bob

This command produces no output.

For more information, see `Managing passwords for IAM users <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_passwords_admin-change-user.html>`__ in the *AWS IAM User Guide*.