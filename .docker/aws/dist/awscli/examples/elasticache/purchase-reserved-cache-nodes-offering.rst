**To purchase a reserved-cache-node-offering**

The following ``purchase-reserved-cache-nodes-offering`` example allows you to purchase a reserved cache node offering. ::

    aws elasticache purchase-reserved-cache-nodes-offering \
        --reserved-cache-nodes-offering-id xxxxxxx-4da5-4b90-b92d-929fbd7abed2

Output ::

    {
        "ReservedCacheNode": {
            "ReservedCacheNodeId": "ri-2020-06-30-17-59-40-474",
            "ReservedCacheNodesOfferingId": "xxxxxxx-4da5-4b90-b92d-929fbd7abed2",
            "CacheNodeType": "cache.m3.2xlarge",
            "StartTime": "2020-06-30T17:59:40.474000+00:00",
            "Duration": 31536000,
            "FixedPrice": 1772.0,
            "UsagePrice": 0.0,
            "CacheNodeCount": 1,
            "ProductDescription": "redis",
            "OfferingType": "Heavy Utilization",
            "State": "payment-pending",
            "RecurringCharges": [
                {
                    "RecurringChargeAmount": 0.25,
                    "RecurringChargeFrequency": "Hourly"
                }
            ]
        }
    }

For more information, see `Getting Info About Reserved Node Offerings <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/reserved-nodes-offerings.html>`__ in the *Elasticache Redis User Guide* or `Getting Info About Reserved Node Offerings <https://docs.aws.amazon.com/AmazonElastiCache/latest/mem-ug/reserved-nodes-offerings.html>`__ in the *Elasticache Memcached User Guide*.
