**To create a stream for delivering one or more large files in chunks over MQTT**

The following ``create-stream`` example creates a stream for delivering one or more large files in chunks over MQTT. A stream transports data bytes in chunks or blocks packaged as MQTT messages from a source like S3. You can have one or more files associated with a stream. ::

    aws iot create-stream \
        --cli-input-json file://create-stream.json

Contents of ``create-stream.json``::

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
        ],
        "roleArn": "arn:aws:iam:123456789012:role/service-role/my_ota_stream_role"
    }

Output::

    {
         "streamId": "stream12345",
         "streamArn": "arn:aws:iot:us-west-2:123456789012:stream/stream12345",
         "description": "This stream is used for Amazon FreeRTOS OTA Update 12345.",
         "streamVersion": "1"
    }

For more information, see `CreateStream <https://docs.aws.amazon.com/iot/latest/apireference/API_CreateStream.html>`__ in the *AWS IoT API Reference*.