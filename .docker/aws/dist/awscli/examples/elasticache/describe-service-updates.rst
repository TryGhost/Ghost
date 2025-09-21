**To describe service updates**

The following ``describe-service-updates`` example returns details about service updates. ::

    aws elasticache describe-service-updates 

Output::

   {
        "ServiceUpdates": [
            {
                "ServiceUpdateName": "elc-xxxxxxxx7-001",
                "ServiceUpdateReleaseDate": "2019-10-09T16:00:00Z",
                "ServiceUpdateEndDate": "2020-02-09T15:59:59Z",
                "ServiceUpdateSeverity": "important",
                "ServiceUpdateRecommendedApplyByDate": "2019-11-08T15:59:59Z",
                "ServiceUpdateStatus": "available",
                "ServiceUpdateDescription": "Upgrades to improve the security, reliability, and operational performance of your ElastiCache nodes",
                "ServiceUpdateType": "security-update",
                "Engine": "redis, memcached",
                "EngineVersion": "redis 2.6.13 and onwards, memcached 1.4.5 and onwards",
                "AutoUpdateAfterRecommendedApplyByDate": false,
                "EstimatedUpdateTime": "30 minutes per node"
            },
            {
                "ServiceUpdateName": "elc-xxxxxxxx4-001",
                "ServiceUpdateReleaseDate": "2019-06-11T15:00:00Z",
                "ServiceUpdateEndDate": "2019-10-01T09:24:00Z",
                "ServiceUpdateSeverity": "important",
                "ServiceUpdateRecommendedApplyByDate": "2019-07-11T14:59:59Z",
                "ServiceUpdateStatus": "expired",
                "ServiceUpdateDescription": "Upgrades to improve the security, reliability, and operational performance of your ElastiCache nodes",
                "ServiceUpdateType": "security-update",
                "Engine": "redis",
                "EngineVersion": "redis 3.2.6, redis 4.0 and onwards",
                "AutoUpdateAfterRecommendedApplyByDate": false,
                "EstimatedUpdateTime": "30 minutes per node"
            }
        ]
    }
