**To list invalidations for a CloudFront distribution tenant**

The following ``list-invalidations-for-distribution-tenant`` example lists the invalidations for a CloudFront distribution tenant. ::

    aws cloudfront list-invalidations-for-distribution-tenant \
        --id dt_2wjDZi3hD1ivOXf6rpZJOSNE1AB

Output::

    {
        "InvalidationList": {
            "Items": [
                {
                    "Id": "I4CU23QAPKMUDUU06F9OFGFABC",
                    "CreateTime": "2025-05-06T15:46:12.824000+00:00",
                    "Status": "Completed"
                }
            ]
        }
    }

For more information, see `Invalidate files to remove content <https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html>`__ in the *Amazon CloudFront Developer Guide*.