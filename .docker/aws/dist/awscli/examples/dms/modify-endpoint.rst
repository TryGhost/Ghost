**To modify an endpoint**

The following ``modify-endpoint`` example adds an extra connection attribute to an endpoint. ::

    aws dms modify-endpoint \
        --endpoint-arn "arn:aws:dms:us-east-1:123456789012:endpoint:GUVAFG34EECUOJ6QVZ56DAHT3U" \
        --extra-connection-attributes "compressionType=GZIP" 

Output::

    {
        "Endpoint": {
            "EndpointIdentifier": "src-endpoint",
            "EndpointType": "SOURCE",
            "EngineName": "s3",
            "EngineDisplayName": "Amazon S3",
            "ExtraConnectionAttributes": "compressionType=GZIP;csvDelimiter=,;csvRowDelimiter=\\n;",
            "Status": "active",
            "EndpointArn": "arn:aws:dms:us-east-1:123456789012:endpoint:GUVAFG34EECUOJ6QVZ56DAHT3U",
            "SslMode": "none",
            "ServiceAccessRoleArn": "arn:aws:iam::123456789012:role/my-s3-access-role",
            "S3Settings": {
                "ServiceAccessRoleArn": "arn:aws:iam::123456789012:role/my-s3-access-role",
                "CsvRowDelimiter": "\\n",
                "CsvDelimiter": ",",
                "BucketFolder": "",
                "BucketName": "",
                "CompressionType": "GZIP",
                "EnableStatistics": true
            }
        }
    }

For more information, see `Working with AWS DMS Endpoints` <https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Endpoints.html>`__ in the *AWS Database Migration Service User Guide*.

