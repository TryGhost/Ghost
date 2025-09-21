**To get a list of detectors for a detector model**

The following ``list-detectors`` example lists detectors (the instances of a detector model). ::

    aws iotevents-data list-detectors \
        --detector-model-name motorDetectorModel

Output::

    {
        "detectorSummaries": [
            {
                "lastUpdateTime": 1558129925.2, 
                "creationTime": 1552073155.527, 
                "state": {
                    "stateName": "Normal"
                }, 
                "keyValue": "Fulton-A32", 
                "detectorModelName": "motorDetectorModel", 
                "detectorModelVersion": "1"
            }
        ]
    }

For more information, see `ListDetectors <https://docs.aws.amazon.com/iotevents/latest/developerguide/iotevents-commands.html#api-iotevents-ListDetectors>`__ in the *AWS IoT Events Developer Guide**.

