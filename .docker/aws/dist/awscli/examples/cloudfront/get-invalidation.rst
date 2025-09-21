**To get a CloudFront invalidation**

The following example gets the invalidation with the ID ``I2J0I21PCUYOIK`` for
the CloudFront distribution with the ID ``EDFDVBD6EXAMPLE``::

    aws cloudfront get-invalidation --id I2J0I21PCUYOIK --distribution-id EDFDVBD6EXAMPLE

Output::

    {
        "Invalidation": {
            "Status": "Completed",
            "InvalidationBatch": {
                "Paths": {
                    "Items": [
                        "/example-path/example-file.jpg",
                        "/example-path/example-file-2.jpg"
                    ],
                    "Quantity": 2
                },
                "CallerReference": "cli-example"
            },
            "Id": "I2J0I21PCUYOIK",
            "CreateTime": "2019-12-05T18:40:49.413Z"
        }
    }
