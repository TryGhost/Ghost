**To describe update actions**

The following ``describe-update-actions`` example returns details of update actions. ::

    aws elasticache describe-update-actions 

Output::

    {
        "UpdateActions": [
            {
                "ReplicationGroupId": "mycluster",
                "ServiceUpdateName": "elc-20191007-001",
                "ServiceUpdateReleaseDate": "2019-10-09T16:00:00Z",
                "ServiceUpdateSeverity": "important",
                "ServiceUpdateStatus": "available",
                "ServiceUpdateRecommendedApplyByDate": "2019-11-08T15:59:59Z",
                "ServiceUpdateType": "security-update",
                "UpdateActionAvailableDate": "2019-12-05T19:15:19.995Z",
                "UpdateActionStatus": "complete",
                "NodesUpdated": "9/9",
                "UpdateActionStatusModifiedDate": "2019-12-05T19:15:20.461Z",
                "SlaMet": "n/a",
                "Engine": "redis"
            },
            {
                "CacheClusterId": "my-memcached-cluster",
                "ServiceUpdateName": "elc-20191007-001",
                "ServiceUpdateReleaseDate": "2019-10-09T16:00:00Z",
                "ServiceUpdateSeverity": "important",
                "ServiceUpdateStatus": "available",
                "ServiceUpdateRecommendedApplyByDate": "2019-11-08T15:59:59Z",
                "ServiceUpdateType": "security-update",
                "UpdateActionAvailableDate": "2019-12-04T18:26:05.349Z",
                "UpdateActionStatus": "complete",
                "NodesUpdated": "1/1",
                "UpdateActionStatusModifiedDate": "2019-12-04T18:26:05.352Z",
                "SlaMet": "n/a",
                "Engine": "redis"
            },
            {
                "ReplicationGroupId": "my-cluster",
                "ServiceUpdateName": "elc-20191007-001",
                "ServiceUpdateReleaseDate": "2019-10-09T16:00:00Z",
                "ServiceUpdateSeverity": "important",
                "ServiceUpdateStatus": "available",
                "ServiceUpdateRecommendedApplyByDate": "2019-11-08T15:59:59Z",
                "ServiceUpdateType": "security-update",
                "UpdateActionAvailableDate": "2019-11-26T03:36:26.320Z",
                "UpdateActionStatus": "complete",
                "NodesUpdated": "4/4",
                "UpdateActionStatusModifiedDate": "2019-12-04T22:11:12.664Z",
                "SlaMet": "n/a",
                "Engine": "redis"
            },
            {
                "ReplicationGroupId": "my-cluster2",
                "ServiceUpdateName": "elc-20191007-001",
                "ServiceUpdateReleaseDate": "2019-10-09T16:00:00Z",
                "ServiceUpdateSeverity": "important",
                "ServiceUpdateStatus": "available",
                "ServiceUpdateRecommendedApplyByDate": "2019-11-08T15:59:59Z",
                "ServiceUpdateType": "security-update",
                "UpdateActionAvailableDate": "2019-11-26T01:26:01.617Z",
                "UpdateActionStatus": "complete",
                "NodesUpdated": "3/3",
                "UpdateActionStatusModifiedDate": "2019-11-26T01:26:01.753Z",
                "SlaMet": "n/a",
                "Engine": "redis"
            }
        ]
    }

For more information, see `Self-Service Updates in Amazon ElastiCache <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/Self-Service-Updates.html>`__ in the *Elasticache User Guide*.
