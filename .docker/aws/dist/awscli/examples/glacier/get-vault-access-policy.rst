**To retrieve the access policy of a vault**

The following ``get-vault-access-policy`` example retrieves the access policy for the specified vault. ::

    aws glacier get-vault-access-policy \
        --account-id 111122223333 \
        --vault-name example_vault

Output::

    {
        "policy": {
            "Policy": "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"AWS\":\"arn:aws:iam::444455556666:root\"},\"Action\":\"glacier:ListJobs\",\"Resource\":\"arn:aws:glacier:us-east-1:111122223333:vaults/example_vault\"},{\"Effect\":\"Allow\",\"Principal\":{\"AWS\":\"arn:aws:iam::444455556666:root\"},\"Action\":\"glacier:UploadArchive\",\"Resource\":\"arn:aws:glacier:us-east-1:111122223333:vaults/example_vault\"}]}"
        }
    }
