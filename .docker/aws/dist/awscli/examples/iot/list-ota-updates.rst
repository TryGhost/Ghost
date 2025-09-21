**To list OTA Updates for the account**

The following ``list-ota-updates`` example lists the available OTA updates. ::

    aws iot list-ota-updates

Output::

    {
        "otaUpdates": [
            {
                "otaUpdateId": "itsaupdate",
                "otaUpdateArn": "arn:aws:iot:us-west-2:123456789012:otaupdate/itsaupdate",
                "creationDate": 1557863215.995
            }
        ]
    }

For more information, see `ListOTAUpdates <https://docs.aws.amazon.com/iot/latest/apireference/API_ListOTAUpdates.html>`__ in the *AWS IoT API Reference*.
