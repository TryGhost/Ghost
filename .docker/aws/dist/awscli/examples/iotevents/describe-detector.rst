**To get information about a detector (instance).**

The following ``describe-detector`` example displays details for the specified detector (instance). ::

    aws iotevents-data describe-detector \
        --detector-model-name motorDetectorModel \
        --key-value "Fulton-A32"

Output::

    {
        "detector": {
            "lastUpdateTime": 1560797852.776, 
            "creationTime": 1560797852.775, 
            "state": {
                "variables": [
                    {
                        "name": "pressureThresholdBreached", 
                        "value": "3"
                    }
                ], 
                "stateName": "Dangerous", 
                "timers": []
            }, 
            "keyValue": "Fulton-A32", 
            "detectorModelName": "motorDetectorModel", 
            "detectorModelVersion": "1"
        }
    }

For more information, see `DescribeDetector <https://docs.aws.amazon.com/iotevents/latest/apireference/API_iotevents-data_DescribeDetector>`__ in the *AWS IoT Events API Reference*.
