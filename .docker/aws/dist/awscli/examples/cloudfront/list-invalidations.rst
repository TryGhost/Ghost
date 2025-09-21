**To list CloudFront invalidations**

The following example gets a list of the invalidations for the CloudFront
distribution with the ID ``EDFDVBD6EXAMPLE``::

    aws cloudfront list-invalidations --distribution-id EDFDVBD6EXAMPLE

Output::

    {
        "InvalidationList": {
            "Marker": "",
            "Items": [
                {
                    "Status": "Completed",
                    "Id": "YNY2LI2BVJ4NJU",
                    "CreateTime": "2019-08-31T21:15:52.042Z"
                }
            ],
            "IsTruncated": false,
            "MaxItems": 100,
            "Quantity": 1
        }
    }
