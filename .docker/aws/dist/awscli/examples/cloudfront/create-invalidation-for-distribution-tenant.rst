**To create a CloudFront invalidation for a distribution tenant**

The following ``create-invalidation-for-distribution-tenant`` example creates an invalidation for all files in a CloudFront distribution tenant. ::

    aws cloudfront create-invalidation-for-distribution-tenant \
        --id dt_2wjDZi3hD1ivOXf6rpZJO1AB \
        --invalidation-batch '{"Paths": {"Quantity": 1, "Items": ["/*"]}, "CallerReference": "invalidation-$(date +%s)"}'

Output::

    {
        "Location": "https://cloudfront.amazonaws.com/2020-05-31/distribution-tenant/dt_2wjDZi3hD1ivOXf6rpZJO1AB/invalidation/I2JGL2F1ZAA426PGG0YLLKABC",
        "Invalidation": {
            "Id": "I2JGL2F1ZAA426PGG0YLLKABC",
            "Status": "InProgress",
            "CreateTime": "2025-05-07T16:59:25.947000+00:00",
            "InvalidationBatch": {
                "Paths": {
                    "Quantity": 1,
                    "Items": [
                        "/*"
                    ]
                },
                "CallerReference": "invalidation-$(date +%s)"
            }
        }
    }

For more information, see `Invalidate files to remove content <https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html>`__ in the *Amazon CloudFront Developer Guide*.