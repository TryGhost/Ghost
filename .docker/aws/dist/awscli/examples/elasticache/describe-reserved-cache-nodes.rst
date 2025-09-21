**To describe reserved cache nodes**

The following ``describe-reserved-cache-nodes`` example returns information about reserved cache nodes for this account, or about the specified reserved cache node.

    aws elasticache describe-reserved-cache-nodes 

Output::

    {
        "ReservedCacheNodes": [
            {
                "ReservedCacheNodeId": "mynode",
                "ReservedCacheNodesOfferingId": "xxxxxxxxx-xxxxx-xxxxx-xxxx-xxxxxxxx71",
                "CacheNodeType": "cache.t3.small",
                "StartTime": "2019-12-06T02:50:44.003Z",
                "Duration": 31536000,
                "FixedPrice": 0.0,
                "UsagePrice": 0.0,
                "CacheNodeCount": 1,
                "ProductDescription": "redis",
                "OfferingType": "No Upfront",
                "State": "payment-pending",
                "RecurringCharges": [
                    {
                        "RecurringChargeAmount": 0.023,
                        "RecurringChargeFrequency": "Hourly"
                    }
                ],
                "ReservationARN": "arn:aws:elasticache:us-west-2:xxxxxxxxxxxx52:reserved-instance:mynode"
            }
        ]
    }

For more information, see `Managing Costs with Reserved Nodes <https://docs.aws.amazon.com/AmazonElastiCache/latest/mem-ug/reserved-nodes.html>`__ in the *Elasticache User Guide*.
