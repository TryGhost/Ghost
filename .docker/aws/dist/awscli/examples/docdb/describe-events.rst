**To list Amazon DocumentDB events**

The following ``describe-events`` example list all the Amazon DocumentDB events for the last 24 hours (1440 minutes). ::

    aws docdb describe-events \
        --duration 1440

This command produces no output.
Output::

    {
        "Events": [
            {
                "EventCategories": [
                    "failover"
                ],
                "Message": "Started cross AZ failover to DB instance: sample-cluster",
                "Date": "2019-03-18T21:36:29.807Z",
                "SourceArn": "arn:aws:rds:us-west-2:123456789012:cluster:sample-cluster",
                "SourceIdentifier": "sample-cluster",
                "SourceType": "db-cluster"
            },
            {
                "EventCategories": [
                    "availability"
                ],
                "Message": "DB instance restarted",
                "Date": "2019-03-18T21:36:40.793Z",
                "SourceArn": "arn:aws:rds:us-west-2:123456789012:db:sample-cluster",
                "SourceIdentifier": "sample-cluster",
                "SourceType": "db-instance"
            },
            {
                "EventCategories": [],
                "Message": "A new writer was promoted. Restarting database as a reader.",
                "Date": "2019-03-18T21:36:43.873Z",
                "SourceArn": "arn:aws:rds:us-west-2:123456789012:db:sample-cluster2",
                "SourceIdentifier": "sample-cluster2",
                "SourceType": "db-instance"
            },
            {
                "EventCategories": [
                    "availability"
                ],
                "Message": "DB instance restarted",
                "Date": "2019-03-18T21:36:51.257Z",
                "SourceArn": "arn:aws:rds:us-west-2:123456789012:db:sample-cluster2",
                "SourceIdentifier": "sample-cluster2",
                "SourceType": "db-instance"
            },
            {
                "EventCategories": [
                    "failover"
                ],
                "Message": "Completed failover to DB instance: sample-cluster",
                "Date": "2019-03-18T21:36:53.462Z",
                "SourceArn": "arn:aws:rds:us-west-2:123456789012:cluster:sample-cluster",
                "SourceIdentifier": "sample-cluster",
                "SourceType": "db-cluster"
            },
            {
                "Date": "2019-03-19T16:51:48.847Z",
                "EventCategories": [
                    "configuration change"
                ],
                "Message": "Updated parameter audit_logs to enabled with apply method pending-reboot",
                "SourceIdentifier": "custom3-6-param-grp",
                "SourceType": "db-parameter-group"
            },
            {
                "EventCategories": [
                    "configuration change"
                ],
                "Message": "Applying modification to database instance class",
                "Date": "2019-03-19T17:55:20.095Z",
                "SourceArn": "arn:aws:rds:us-west-2:123456789012:db:sample-cluster2",
                "SourceIdentifier": "sample-cluster2",
                "SourceType": "db-instance"
            },
            {
                "EventCategories": [
                    "availability"
                ],
                "Message": "DB instance shutdown",
                "Date": "2019-03-19T17:56:31.127Z",
                "SourceArn": "arn:aws:rds:us-west-2:123456789012:db:sample-cluster2",
                "SourceIdentifier": "sample-cluster2",
                "SourceType": "db-instance"
            },
            {
                "EventCategories": [
                    "configuration change"
                ],
                "Message": "Finished applying modification to DB instance class",
                "Date": "2019-03-19T18:00:45.822Z",
                "SourceArn": "arn:aws:rds:us-west-2:123456789012:db:sample-cluster2",
                "SourceIdentifier": "sample-cluster2",
                "SourceType": "db-instance"
            },
            {
                "EventCategories": [
                    "availability"
                ],
                "Message": "DB instance restarted",
                "Date": "2019-03-19T18:00:53.397Z",
                "SourceArn": "arn:aws:rds:us-west-2:123456789012:db:sample-cluster2",
                "SourceIdentifier": "sample-cluster2",
                "SourceType": "db-instance"
            },
            {
                "EventCategories": [
                    "availability"
                ],
                "Message": "DB instance shutdown",
                "Date": "2019-03-19T18:23:36.045Z",
                "SourceArn": "arn:aws:rds:us-west-2:123456789012:db:sample-cluster2",
                "SourceIdentifier": "sample-cluster2",
                "SourceType": "db-instance"
            },
            {
                "EventCategories": [
                    "availability"
                ],
                "Message": "DB instance restarted",
                "Date": "2019-03-19T18:23:46.209Z",
                "SourceArn": "arn:aws:rds:us-west-2:123456789012:db:sample-cluster2",
                "SourceIdentifier": "sample-cluster2",
                "SourceType": "db-instance"
            },
            {
                "Date": "2019-03-19T18:39:05.822Z",
                "EventCategories": [
                    "configuration change"
                ],
                "Message": "Updated parameter ttl_monitor to enabled with apply method immediate",
                "SourceIdentifier": "custom3-6-param-grp",
                "SourceType": "db-parameter-group"
            },
            {
                "Date": "2019-03-19T18:39:48.067Z",
                "EventCategories": [
                    "configuration change"
                ],
                "Message": "Updated parameter audit_logs to disabled with apply method immediate",
                "SourceIdentifier": "custom3-6-param-grp",
                "SourceType": "db-parameter-group"
            }
        ]
    }

For more information, see `Viewing Amazon DocumentDB Events <https://docs.aws.amazon.com/ documentdb/latest/developerguide/managing-events.html#viewing-events>`__ in the *Amazon DocumentDB Developer Guide*.
