**To retrieve a list of metrics configurations for a bucket**

The following ``list-bucket-metrics-configurations`` example retrieves a list of metrics configurations for the specified bucket. ::

    aws s3api list-bucket-metrics-configurations \
        --bucket amzn-s3-demo-bucket

Output::

    {
        "IsTruncated": false,
        "MetricsConfigurationList": [
            {
                "Filter": {
                    "Prefix": "logs"
                },
                "Id": "123"
            },
            {
                "Filter": {
                    "Prefix": "tmp"
                },
                "Id": "234"
            }
        ]
    }
