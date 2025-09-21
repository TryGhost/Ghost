**To get information about versions of a detector model**

The following ``list-detector-model-versions`` example lists all the versions of a detector model. Only the metadata associated with each detector model version is returned. ::

    aws iotevents list-detector-model-versions \
        --detector-model-name motorDetectorModel

Output::

    {
        "detectorModelVersionSummaries": [
            {
                "status": "ACTIVE", 
                "lastUpdateTime": 1560796816.077, 
                "roleArn": "arn:aws:iam::123456789012:role/IoTEventsRole", 
                "creationTime": 1560796816.077, 
                "detectorModelArn": "arn:aws:iotevents:us-west-2:123456789012:detectorModel/motorDetectorModel", 
                "detectorModelName": "motorDetectorModel", 
                "detectorModelVersion": "1"
            }
        ]
    }

For more information, see `ListDetectorModelVersions <https://docs.aws.amazon.com/iotevents/latest/developerguide/iotevents-commands.html#api-iotevents-ListDetectorModelVersions>`__ in the *AWS IoT Events Developer Guide**.
