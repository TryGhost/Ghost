**To apply a service update**

The following ``batch-apply-update-action`` example applies a service update to a Redis cluster. ::

    aws elasticache batch-apply-update-action \
        --service-update-name elc-xxxxx406-xxx \
        --replication-group-ids test-cluster 

Output::

    {
        "ProcessedUpdateActions": [
            {
                "ReplicationGroupId": "pat-cluster",
                "ServiceUpdateName": "elc-xxxxx406-xxx",
                "UpdateActionStatus": "waiting-to-start"
            }
        ],
        "UnprocessedUpdateActions": []
    }

For more information, see `Self-Service Updates in Amazon ElastiCache <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/Self-Service-Updates.html>`__ in the *Elasticache User Guide*.
