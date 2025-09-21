**To describe events**

The following ``describe-events`` example retrieves details for the events that have occurred for the specified DB instance. ::

    aws rds describe-events \
        --source-identifier test-instance \
        --source-type db-instance

Output::

    {
        "Events": [
            {
                "SourceType": "db-instance",
                "SourceIdentifier": "test-instance",
                "EventCategories": [
                    "backup"
                ],
                "Message": "Backing up DB instance",
                "Date": "2018-07-31T23:09:23.983Z",
                "SourceArn": "arn:aws:rds:us-east-1:123456789012:db:test-instance"
            },
            {
                "SourceType": "db-instance",
                "SourceIdentifier": "test-instance",
                "EventCategories": [
                    "backup"
                ],
                "Message": "Finished DB Instance backup",
                "Date": "2018-07-31T23:15:13.049Z",
                "SourceArn": "arn:aws:rds:us-east-1:123456789012:db:test-instance"
            }
        ]
    }
