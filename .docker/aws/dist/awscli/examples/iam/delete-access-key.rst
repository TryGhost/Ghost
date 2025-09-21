**To delete an access key for an IAM user**

The following ``delete-access-key`` command deletes the specified access key (access key ID and secret access key) for the IAM user named ``Bob``. ::

    aws iam delete-access-key \
        --access-key-id AKIDPMS9RO4H3FEXAMPLE \
        --user-name Bob

This command produces no output.

To list the access keys defined for an IAM user, use the ``list-access-keys`` command.

For more information, see `Managing access keys for IAM users <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html>`__ in the *AWS IAM User Guide*.