**To list the access key IDs for an IAM user**

The following ``list-access-keys`` command lists the access keys IDs for the IAM user named ``Bob``. ::

    aws iam list-access-keys \
        --user-name Bob

Output::

    {
        "AccessKeyMetadata": [
            {
                "UserName": "Bob",
                "Status": "Active",
                "CreateDate": "2013-06-04T18:17:34Z",
                "AccessKeyId": "AKIAIOSFODNN7EXAMPLE"
            },
            {
                "UserName": "Bob",
                "Status": "Inactive",
                "CreateDate": "2013-06-06T20:42:26Z",
                "AccessKeyId": "AKIAI44QH8DHBEXAMPLE"
            }
        ]
    }

You cannot list the secret access keys for IAM users. If the secret access keys are lost, you must create new access keys using the ``create-access-keys`` command.

For more information, see `Managing access keys for IAM users <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html>`__ in the *AWS IAM User Guide*.