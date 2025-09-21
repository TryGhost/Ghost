**To get an invalidation for a distribution tenant**

The following ``get-invalidation-for-distribution-tenant`` example gets information about an invalidation for a distribution tenant. ::

    aws cloudfront get-invalidation-for-distribution-tenant \
        --distribution-tenant-id dt_2wjDZi3hD1ivOXf6rpZJOSNE1AB \
        --id I4CU23QAPKMUDUU06F9OFGFABC

Output::

    {
        "Invalidation": {
            "Id": "I4CU23QAPKMUDUU06F9OFGFABC",
            "Status": "Completed",
            "CreateTime": "2025-05-06T15:46:12.824000+00:00",
            "InvalidationBatch": {
                "Paths": {
                    "Quantity": 2,
                    "Items": [
                        "/example/invalidation",
                        "/more/invalidations"
                    ]
                },
                "CallerReference": "007ee5a6-d0a0-42be-bb61-e7b915969b48"
            }
        }
    }

For more information, see `Invalidate files to remove content <https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html>`__ in the *Amazon CloudFront Developer Guide*.
