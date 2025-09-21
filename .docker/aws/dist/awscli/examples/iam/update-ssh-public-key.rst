**To change the status of an SSH public key**

The following ``update-ssh-public-key`` command changes the status of the specified public key to ``Inactive``. ::

    aws iam update-ssh-public-key \
        --user-name sofia \
        --ssh-public-key-id APKA1234567890EXAMPLE \
        --status Inactive

This command produces no output.

For more information, see `Use SSH keys and SSH with CodeCommit <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_ssh-keys.html#ssh-keys-code-commit>`__ in the *AWS IAM User Guide*.