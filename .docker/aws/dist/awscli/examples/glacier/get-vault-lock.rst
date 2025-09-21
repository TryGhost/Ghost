**To get the details of a vault lock**

The following ``get-vault-lock`` example retrieved the details about the lock for the specified vault. ::

    aws glacier get-vault-lock \
        --account-id - \
        --vault-name MyVaultName 
        
Output::

    {
        "Policy": "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Sid\":\"Define-vault-lock\",\"Effect\":\"Deny\",\"Principal\":{\"AWS\":\"arn:aws:iam::999999999999:root\"},\"Action\":\"glacier:DeleteArchive\",\"Resource\":\"arn:aws:glacier:us-west-2:99999999999:vaults/MyVaultName\",\"Condition\":{\"NumericLessThanEquals\":{\"glacier:ArchiveAgeinDays\":\"365\"}}}]}",
        "State": "Locked",
        "CreationDate": "2019-07-29T22:25:28.640Z"
    }

For more information, see `Get Vault Lock (GET lock-policy) <https://docs.aws.amazon.com/amazonglacier/latest/dev/api-GetVaultLock.html>`__ in the *Amazon Glacier API Developer Guide*.
