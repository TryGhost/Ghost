**To create an invalidation for a CloudFront distribution**

The following ``create-invalidation`` example creates an invalidation for the specified files in the specified CloudFront distribution::

    aws cloudfront create-invalidation \
        --distribution-id EDFDVBD6EXAMPLE \
        --paths "/example-path/example-file.jpg" "/example-path/example-file2.png"

Output::

    {
        "Location": "https://cloudfront.amazonaws.com/2019-03-26/distribution/EDFDVBD6EXAMPLE/invalidation/I1JLWSDAP8FU89",
        "Invalidation": {
            "Id": "I1JLWSDAP8FU89",
            "Status": "InProgress",
            "CreateTime": "2019-12-05T18:24:51.407Z",
            "InvalidationBatch": {
                "Paths": {
                    "Quantity": 2,
                    "Items": [
                        "/example-path/example-file2.png",
                        "/example-path/example-file.jpg"
                    ]
                },
                "CallerReference": "cli-1575570291-670203"
            }
        }
    }

In the previous example, the AWS CLI automatically generated a random ``CallerReference``. To specify your own ``CallerReference``, or to avoid passing the invalidation parameters as command line arguments, you can use a JSON file. The following example creates an invalidation for two files, by providing the invalidation parameters in a JSON file named ``inv-batch.json``::

    aws cloudfront create-invalidation \
        --distribution-id EDFDVBD6EXAMPLE \
        --invalidation-batch file://inv-batch.json

Contents of ``inv-batch.json``::

    {
        "Paths": {
            "Quantity": 2,
            "Items": [
                "/example-path/example-file.jpg",
                "/example-path/example-file2.png"
            ]
        },
        "CallerReference": "cli-example"
    }

Output::

    {
        "Location": "https://cloudfront.amazonaws.com/2019-03-26/distribution/EDFDVBD6EXAMPLE/invalidation/I2J0I21PCUYOIK",
        "Invalidation": {
            "Id": "I2J0I21PCUYOIK",
            "Status": "InProgress",
            "CreateTime": "2019-12-05T18:40:49.413Z",
            "InvalidationBatch": {
                "Paths": {
                    "Quantity": 2,
                    "Items": [
                        "/example-path/example-file.jpg",
                        "/example-path/example-file2.png"
                    ]
                },
                "CallerReference": "cli-example"
            }
        }
    }
