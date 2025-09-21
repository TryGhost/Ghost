**To create an endpoint**

The following ``create-endpoint`` example creates an endpoint for an Amazon S3 source. ::

    aws dms create-endpoint \
        --endpoint-type source \
        --engine-name s3 \
        --endpoint-identifier src-endpoint \
        --s3-settings file://s3-settings.json


Contents of ``s3-settings.json``::

    {
        "BucketName":"my-corp-data",
        "BucketFolder":"sourcedata",
        "ServiceAccessRoleArn":"arn:aws:iam::123456789012:role/my-s3-access-role"
    }

Output::

    {
        "Endpoint": {
            "EndpointIdentifier": "src-endpoint",
            "EndpointType": "SOURCE",
            "EngineName": "s3",
            "EngineDisplayName": "Amazon S3",
            "ExtraConnectionAttributes": "bucketFolder=sourcedata;bucketName=my-corp-data;compressionType=NONE;csvDelimiter=,;csvRowDelimiter=\\n;",
            "Status": "active",
            "EndpointArn": "arn:aws:dms:us-east-1:123456789012:endpoint:GUVAFG34EECUOJ6QVZ56DAHT3U",
            "SslMode": "none",
            "ServiceAccessRoleArn": "arn:aws:iam::123456789012:role/my-s3-access-role",
            "S3Settings": {
                "ServiceAccessRoleArn": "arn:aws:iam::123456789012:role/my-s3-access-role",
                "CsvRowDelimiter": "\\n",
                "CsvDelimiter": ",",
                "BucketFolder": "sourcedata",
                "BucketName": "my-corp-data",
                "CompressionType": "NONE",
                "EnableStatistics": true
            }
        }
    }

For more information, see `Working with AWS DMS Endpoints <https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Endpoints.html>`__ in the *AWS Database Migration Service User Guide*.
