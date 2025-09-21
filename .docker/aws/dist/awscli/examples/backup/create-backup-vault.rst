**To create a backup vault**

The following ``create-backup-vault`` example creates a backup vault with the specified name. ::

    aws backup create-backup-vault 
        --backup-vault-name sample-vault

This command produces no output.
Output::

    {
        "BackupVaultName": "sample-vault",
        "BackupVaultArn": "arn:aws:backup:us-west-2:123456789012:backup-vault:sample-vault",
        "CreationDate": 1568928338.385
    }

For more information, see `Creating a Backup Vault <https://docs.aws.amazon.com/aws-backup/latest/devguide/creating-a-vault.html>`__ in the *AWS Backup Developer Guide*.
