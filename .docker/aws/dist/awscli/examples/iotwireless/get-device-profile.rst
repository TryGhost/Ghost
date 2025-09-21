**To get information about a device profile**

The following ``get-device-profile`` example gets information about the device profile with the specified ID that you created. ::

    aws iotwireless get-device-profile \
        --id "12345678-a1b2-3c45-67d8-e90fa1b2c34d" 

Output::

    {
        "Arn": "arn:aws:iotwireless:us-east-1:123456789012:DeviceProfile/12345678-a1b2-3c45-67d8-e90fa1b2c34d", 
        "Id": "12345678-a1b2-3c45-67d8-e90fa1b2c34d", 
        "LoRaWAN": {
        "MacVersion": "1.0.3", 
        "MaxDutyCycle": 10, 
        "Supports32BitFCnt": false, 
        "RegParamsRevision": "RP002-1.0.1", 
        "SupportsJoin": true, 
        "RfRegion": "US915", 
        "MaxEirp": 13, 
        "SupportsClassB": false, 
        "SupportsClassC": false
        }
    }

For more information, see `Add profiles to AWS IoT Core for LoRaWAN <https://docs.aws.amazon.com/iot/latest/developerguide/connect-iot-lorawan-define-profiles.html>`__ in the *AWS IoT Developers Guide*.
