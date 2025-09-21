**To get information about a service profile**

The following ``get-service-profile`` example gets information about the service profile with the specified ID that you created. ::

    aws iotwireless get-service-profile \
        --id "12345678-a1b2-3c45-67d8-e90fa1b2c34d" 

Output::

    {
        "Arn": "arn:aws:iotwireless:us-east-1:651419225604:ServiceProfile/538185bb-d7e7-4b95-96a0-c51aa4a5b9a0", 
        "Id": "12345678-a1b2-3c45-67d8-e90fa1b2c34d", 
        "LoRaWAN": {
            "HrAllowed": false, 
            "NwkGeoLoc": false, 
            "DrMax": 15, 
            "UlBucketSize": 4096, 
            "PrAllowed": false, 
            "ReportDevStatusBattery": false, 
            "DrMin": 0, 
            "DlRate": 60, 
            "AddGwMetadata": false, 
            "ReportDevStatusMargin": false, 
            "MinGwDiversity": 1, 
            "RaAllowed": false, 
            "DlBucketSize": 4096, 
            "DevStatusReqFreq": 24, 
            "TargetPer": 5, 
            "UlRate": 60
        }
    }

For more information, see `Add profiles to AWS IoT Core for LoRaWAN <https://docs.aws.amazon.com/iot/latest/developerguide/connect-iot-lorawan-define-profiles.html>`__ in the *AWS IoT Developers Guide*.
