**To delete an SSH public keys attached to an IAM user**

The following ``delete-ssh-public-key`` command deletes the specified SSH public key attached to the IAM user ``sofia``. ::

    aws iam delete-ssh-public-key \
        --user-name sofia \
        --ssh-public-key-id APKA123456789EXAMPLE

This command produces no output.

For more information, see `Use SSH keys and SSH with CodeCommit <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_ssh-keys.html#ssh-keys-code-commit>`__ in the *AWS IAM User Guide*.