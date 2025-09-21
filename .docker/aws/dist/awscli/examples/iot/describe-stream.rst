**To get information about a stream**

The following ``describe-stream`` example displays the details about the specified stream. ::

    aws iot describe-stream \
        --stream-id stream12345

Output::

    {
        "streamInfo": {
            "streamId": "stream12345",
            "streamArn": "arn:aws:iot:us-west-2:123456789012:stream/stream12345",
            "streamVersion": 1,
            "description": "This stream is used for Amazon FreeRTOS OTA Update 12345.",
            "files": [
                {
                    "fileId": "123",
                    "s3Location": {
                        "bucket":"codesign-ota-bucket",
                        "key":"48c67f3c-63bb-4f92-a98a-4ee0fbc2bef6"
                    }
                }
            ],
            "createdAt": 1557863215.995,
            "lastUpdatedAt": 1557863215.995,
            "roleArn": "arn:aws:iam:123456789012:role/service-role/my_ota_stream_role"
        }
    }

For more information, see `DescribeStream <https://docs.aws.amazon.com/iot/latest/apireference/API_DescribeStream.html>`__ in the *AWS IoT API Reference*.
