**To retrieve the logging status for a bucket**

The following ``get-bucket-logging`` example retrieves the logging status for the specified bucket. ::

    aws s3api get-bucket-logging \
        --bucket amzn-s3-demo-bucket

Output::

    {
        "LoggingEnabled": {
            "TargetPrefix": "",
            "TargetBucket": "amzn-s3-demo-bucket-logs"
              }
    }
