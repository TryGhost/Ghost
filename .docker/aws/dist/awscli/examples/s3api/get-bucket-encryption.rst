**To retrieve the server-side encryption configuration for a bucket**

The following ``get-bucket-encryption`` example retrieves the server-side encryption configuration for the bucket ``amzn-s3-demo-bucket``. ::

    aws s3api get-bucket-encryption \
        --bucket amzn-s3-demo-bucket

Output::

    {
        "ServerSideEncryptionConfiguration": {
            "Rules": [
                {
                    "ApplyServerSideEncryptionByDefault": {
                        "SSEAlgorithm": "AES256"
                    }
                }
            ]
        }
    }
