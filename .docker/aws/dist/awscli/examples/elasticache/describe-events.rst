**To describe events of a replication group**

The following ``describe-events`` example returns a list of events for a replication group. ::

    aws elasticache describe-events \
        --source-identifier test-cluster \
        --source-type replication-group


Output::

    {
        "Events": [
            {
                "SourceIdentifier": "test-cluster",
                "SourceType": "replication-group",
                "Message": "Automatic failover has been turned on for replication group test-cluster",
                "Date": "2020-03-18T23:51:34.457Z"
            },
            {
                "SourceIdentifier": "test-cluster",
                "SourceType": "replication-group",
                "Message": "Replication group test-cluster created",
                "Date": "2020-03-18T23:50:31.378Z"
            }
        ]
    }

For more information, see `Monitoring Events <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/ECEvents.html>`__ in the *Elasticache User Guide*.