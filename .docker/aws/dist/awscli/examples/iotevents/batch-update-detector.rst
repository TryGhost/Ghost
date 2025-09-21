**To update a detector (instance)**

The following ``batch-update-detector`` example updates the state, variable values, and timer settings of one or more detectors (instances) of a specified detector model. ::

    aws iotevents-data batch-update-detector \
        --cli-input-json file://budFulton-A32.json

Contents of ``budFulton-A32.json``::

    {
        "detectors": [
            {
                "messageId": "00001", 
                "detectorModelName": "motorDetectorModel", 
                "keyValue": "Fulton-A32", 
                "state": {
                    "stateName": "Normal", 
                    "variables": [
                        {
                            "name": "pressureThresholdBreached", 
                            "value": "0"
                        }
                    ],
                    "timers": [
                    ]
                }
            }
        ]
    }
    
Output::

    {
        "batchUpdateDetectorErrorEntries": []
    }


For more information, see `BatchUpdateDetector <https://docs.aws.amazon.com/iotevents/latest/apireference/API_iotevents-data_BatchUpdateDetector.html>`__ in the *AWS IoT Events API Reference*.
