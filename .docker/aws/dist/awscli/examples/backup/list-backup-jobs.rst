**Example 1: To list all backup jobs**

The following ``list-backup-jobs`` example returns metadata about your backup jobs in your AWS account. ::

    aws backup list-backup-jobs 

Output::

    {
        "BackupJobs": [
            {
                "BackupJobId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "BackupVaultName": "Default",
                "BackupVaultArn": "arn:aws:backup:us-west-2:123456789012:backup-vault:Default",
                "ResourceArn": "arn:aws:ec2:us-west-2:123456789012:instance/i-12345678901234567",
                "CreationDate": 1600721892.929,
                "State": "CREATED",
                "PercentDone": "0.0",
                "IamRoleArn": "arn:aws:iam::123456789012:role/service-role/AWSBackupDefaultServiceRole",
                "StartBy": 1600725492.929,
                "ResourceType": "EC2"
            },
            {
                "BackupJobId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
                "BackupVaultName": "Default",
                "BackupVaultArn": "arn:aws:backup:us-west-2:123456789012:backup-vault:Default",
                "RecoveryPointArn": "arn:aws:backup:us-west-2:123456789012:recovery-point:a1b2c3d4-5678-90ab-cdef-EXAMPLE33333",
                "ResourceArn": "arn:aws:elasticfilesystem:us-west-2:123456789012:file-system/fs-12345678",
                "CreationDate": 1600721724.77,
                "CompletionDate": 1600721744.488,
                "State": "COMPLETED",
                "PercentDone": "100.0",
                "BackupSizeInBytes": 71,
                "IamRoleArn": "arn:aws:iam::123456789012:role/service-role/AWSBackupDefaultServiceRole",
                "StartBy": 1600725324.77,
                "ResourceType": "EFS"
            }
        ]
    }

For more information, see `Creating a Backup <https://https://docs.aws.amazon.com/aws-backup/latest/devguide/creating-a-backup.html>`__ in the *AWS Backup Developer Guide*.

**Example 2: To list completed backup jobs**

The following ``list-backup-jobs`` example returns metadata about your completed backup jobs in your AWS account. ::

    aws backup list-backup-jobs \
        --by-state COMPLETED

Output::

    {
        "BackupJobs": [
            {
                "BackupJobId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
                "BackupVaultName": "Default",
                "BackupVaultArn": "arn:aws:backup:us-west-2:123456789012:backup-vault:Default",
                "RecoveryPointArn": "arn:aws:backup:us-west-2:123456789012:recovery-point:a1b2c3d4-5678-90ab-cdef-EXAMPLE33333",
                "ResourceArn": "arn:aws:elasticfilesystem:us-west-2:123456789012:file-system/fs-12345678",
                "CreationDate": 1600721724.77,
                "CompletionDate": 1600721744.488,
                "State": "COMPLETED",
                "PercentDone": "100.0",
                "BackupSizeInBytes": 71,
                "IamRoleArn": "arn:aws:iam::123456789012:role/service-role/AWSBackupDefaultServiceRole",
                "StartBy": 1600725324.77,
                "ResourceType": "EFS"
            }
        ]
    }

For more information, see `Creating a Backup <https://https://docs.aws.amazon.com/aws-backup/latest/devguide/creating-a-backup.html>`__ in the *AWS Backup Developer Guide*.