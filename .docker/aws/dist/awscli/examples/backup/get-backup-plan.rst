**To get the details of a backup plan**

The following ``get-backup-plan`` example displays the details of the specified backup plan. ::

    aws backup get-backup-plan \
        --backup-plan-id "fcbf5d8f-bd77-4f3a-9c97-f24fb3d373a5"

Output::

    {
        "BackupPlan": {
            "BackupPlanName": "Example-Backup-Plan",
            "Rules": [
                {
                    "RuleName": "DailyBackups",
                    "TargetBackupVaultName": "Default",
                    "ScheduleExpression": "cron(0 5 ? * * *)",
                    "StartWindowMinutes": 480,
                    "CompletionWindowMinutes": 10080,
                    "Lifecycle": {
                        "DeleteAfterDays": 35
                    },
                    "RuleId": "70e0ccdc-e9df-4e83-82ad-c1e5a9471cc3"
                }
            ]
        },
        "BackupPlanId": "fcbf5d8f-bd77-4f3a-9c97-f24fb3d373a5",
        "BackupPlanArn": "arn:aws:backup:us-west-2:123456789012:backup-plan:fcbf5d8f-bd77-4f3a-9c97-f24fb3d373a5",
        "VersionId": "NjQ2ZTZkODktMGVhNy00MmQ0LWE4YjktZTkwNTQ3OTkyYTcw",
        "CreationDate": 1568926091.57
    }

For more information, see `Creating a Backup Plan <https://docs.aws.amazon.com/aws-backup/latest/devguide/creating-a-backup-plan.html>`__ in the *AWS Backup Developer Guide*.
