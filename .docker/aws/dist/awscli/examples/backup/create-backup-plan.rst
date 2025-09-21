**To create a backup plan**

The following ``create-backup-plan`` example creates the specified backup plan with a 35 day retention. ::

    aws backup create-backup-plan \
    --backup-plan "{\"BackupPlanName\":\"Example-Backup-Plan\",\"Rules\":[{\"RuleName\":\"DailyBackups\",\"ScheduleExpression\":\"cron(0 5 ? * * *)\",\"StartWindowMinutes\":480,\"TargetBackupVaultName\":\"Default\",\"Lifecycle\":{\"DeleteAfterDays\":35}}]}"

Output::

    {
        "BackupPlanId": "1fa3895c-a7f5-484a-a371-2dd6a1a9f729",
        "BackupPlanArn": "arn:aws:backup:us-west-2:123456789012:backup-plan:1fa3895c-a7f5-484a-a371-2dd6a1a9f729",
        "CreationDate": 1568928754.747,
        "VersionId": "ZjQ2ZTI5YWQtZDg5Yi00MzYzLWJmZTAtMDI1MzhlMDhjYjEz"
    }

For more information, see `Creating a Backup Plan <https://docs.aws.amazon.com/aws-backup/latest/devguide/creating-a-backup-plan.html>`__ in the *AWS Backup Developer Guide*.
