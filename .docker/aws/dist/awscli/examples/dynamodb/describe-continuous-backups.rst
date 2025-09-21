**To get information about continuous backups for a DynamoDB table**

The following ``describe-continuous-backups`` example displays details about the continuous backup settings for the ``MusicCollection`` table. ::

    aws dynamodb describe-continuous-backups \
        --table-name MusicCollection

Output::

    {
        "ContinuousBackupsDescription": {
            "ContinuousBackupsStatus": "ENABLED",
            "PointInTimeRecoveryDescription": {
                "PointInTimeRecoveryStatus": "DISABLED"
            }
        }
    }

For more information, see `Point-in-Time Recovery for DynamoDB <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/PointInTimeRecovery.html>`__ in the *Amazon DynamoDB Developer Guide*.
