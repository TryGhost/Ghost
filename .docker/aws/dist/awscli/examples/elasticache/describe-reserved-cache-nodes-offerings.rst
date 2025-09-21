**To describe reserved-cache-nodes-offerings**

The following ``describe-reserved-cache-nodes-offerings`` example returns details of a reserved-cache-node options. ::

    aws elasticache describe-reserved-cache-nodes-offerings

Output::

    {
        "ReservedCacheNodesOfferings": [
            {
                "ReservedCacheNodesOfferingId": "01ce0a19-a476-41cb-8aee-48eacbcdc8e5",
                "CacheNodeType": "cache.t3.small",
                "Duration": 31536000,
                "FixedPrice": 97.0,
                "UsagePrice": 0.0,
                "ProductDescription": "memcached",
                "OfferingType": "Partial Upfront",
                "RecurringCharges": [
                    {
                        "RecurringChargeAmount": 0.011,
                        "RecurringChargeFrequency": "Hourly"
                    }
                ]
            },
            {
                "ReservedCacheNodesOfferingId": "0443a27b-4da5-4b90-b92d-929fbd7abed2",
                "CacheNodeType": "cache.m3.2xlarge",
                "Duration": 31536000,
                "FixedPrice": 1772.0,
                "UsagePrice": 0.0,
                "ProductDescription": "redis",
                "OfferingType": "Heavy Utilization",
                "RecurringCharges": [
                    {
                        "RecurringChargeAmount": 0.25,
                        "RecurringChargeFrequency": "Hourly"
                    }
                ]
            },

            ...
            
        ]
    }

For more information, see `Getting Info About Reserved Node Offerings <https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/reserved-nodes-offerings.html>`__ in the *Elasticache Redis User Guide* or `Getting Info About Reserved Node Offerings <https://docs.aws.amazon.com/AmazonElastiCache/latest/mem-ug/reserved-nodes-offerings.html>`__ in the *Elasticache Memcached User Guide*.
