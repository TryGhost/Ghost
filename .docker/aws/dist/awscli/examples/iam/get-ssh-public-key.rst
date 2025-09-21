**Example 1: To retrieve an SSH public key attached to an IAM user in SSH encoded form**

The following ``get-ssh-public-key`` command retrieves the specified SSH public key from the IAM user ``sofia``. The output is in SSH encoding. ::

    aws iam get-ssh-public-key \
        --user-name sofia \
        --ssh-public-key-id APKA123456789EXAMPLE \
        --encoding SSH

Output::

    {
        "SSHPublicKey": {
            "UserName": "sofia",
            "SSHPublicKeyId": "APKA123456789EXAMPLE",
            "Fingerprint": "12:34:56:78:90:ab:cd:ef:12:34:56:78:90:ab:cd:ef",
            "SSHPublicKeyBody": "ssh-rsa <<long encoded SSH string>>",
            "Status": "Inactive",
            "UploadDate": "2019-04-18T17:04:49+00:00"
        }
    }

**Example 2: To retrieve an SSH public key attached to an IAM user in PEM encoded form**

The following ``get-ssh-public-key`` command retrieves the specified SSH public key from the IAM user ``sofia``. The output is in PEM encoding. ::

    aws iam get-ssh-public-key \
        --user-name sofia \
        --ssh-public-key-id APKA123456789EXAMPLE \
        --encoding PEM

Output::

    {
        "SSHPublicKey": {
            "UserName": "sofia",
            "SSHPublicKeyId": "APKA123456789EXAMPLE",
            "Fingerprint": "12:34:56:78:90:ab:cd:ef:12:34:56:78:90:ab:cd:ef",
            "SSHPublicKeyBody": ""-----BEGIN PUBLIC KEY-----\n<<long encoded PEM string>>\n-----END PUBLIC KEY-----\n"",
            "Status": "Inactive",
            "UploadDate": "2019-04-18T17:04:49+00:00"
        }
    }

For more information, see `Use SSH keys and SSH with CodeCommit <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_ssh-keys.html#ssh-keys-code-commit>`__ in the *AWS IAM User Guide*.