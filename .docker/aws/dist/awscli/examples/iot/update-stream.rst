**To update a stream**

The following ``update-stream`` example updates an existing stream. The stream version is incremented by one. ::

    aws iot update-stream \
        --cli-input-json file://update-stream.json

Contents of ``update-stream.json``::

    {
        "streamId": "stream12345",
        "description": "This stream is used for Amazon FreeRTOS OTA Update 12345.",
        "files": [
            {
                "fileId": 123,
                "s3Location": {
                    "bucket":"codesign-ota-bucket",
                    "key":"48c67f3c-63bb-4f92-a98a-4ee0fbc2bef6"
                }
            }
        ]
        "roleArn": "arn:aws:iam:us-west-2:123456789012:role/service-role/my_ota_stream_role"
    }

Output::

    {
        "streamId": "stream12345",
        "streamArn": "arn:aws:iot:us-west-2:123456789012:stream/stream12345",
        "description": "This stream is used for Amazon FreeRTOS OTA Update 12345.",
        "streamVersion": 2
    }

For more information, see `UpdateStream <https://docs.aws.amazon.com/iot/latest/apireference/API_UpdateStream.html>`__ in the *AWS IoT API Reference*.
