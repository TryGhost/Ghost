**To get a list of your detector models**

The following ``list-detector-models`` example lists the detector models you have created. Only the metadata associated with each detector model is returned. ::

    aws iotevents list-detector-models

Output::

    {
        "detectorModelSummaries": [
            {
                "detectorModelName": "motorDetectorModel", 
                "creationTime": 1552072424.212
                "detectorModelDescription": "Detect overpressure in a motor."
            }
        ]
    }

For more information, see `ListDetectorModels <https://docs.aws.amazon.com/iotevents/latest/developerguide/iotevents-commands.html#api-iotevents-ListDetectorModels>`__ in the *AWS IoT Events Developer Guide**.

