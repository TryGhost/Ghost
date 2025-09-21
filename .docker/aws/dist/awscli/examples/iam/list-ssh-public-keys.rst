**To list the SSH public keys attached to an IAM user**

The following ``list-ssh-public-keys`` example lists the SSH public keys attached to the IAM user ``sofia``. ::

    aws iam list-ssh-public-keys \
        --user-name sofia

Output::

    {
        "SSHPublicKeys": [
            {
                "UserName": "sofia",
                "SSHPublicKeyId": "APKA1234567890EXAMPLE",
                "Status": "Inactive",
                "UploadDate": "2019-04-18T17:04:49+00:00"
            }
        ]
    }

For more information, see `Use SSH keys and SSH with CodeCommit <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_ssh-keys.html#ssh-keys-code-commit>`__ in the *AWS IAM User Guide*