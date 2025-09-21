**To list the device profiles**

The following ``list-device-profiles`` example lists the available device profiles registered to your AWS account. ::

    aws iotwireless list-device-profiles 

Output::

    {
        "DeviceProfileList": [
            {
                "Id": "12345678-a1b2-3c45-67d8-e90fa1b2c34d", 
                "Arn": "arn:aws:iotwireless:us-east-1:123456789012:DeviceProfile/12345678-a1b2-3c45-67d8-e90fa1b2c34d"
            }, 
            {
                "Id": "a1b2c3d4-5678-90ab-cdef-12ab345c67de", 
                "Arn": "arn:aws:iotwireless:us-east-1:123456789012:DeviceProfile/a1b2c3d4-5678-90ab-cdef-12ab345c67de"
            }
        ]
    }

For more information, see `Add profiles to AWS IoT Core for LoRaWAN <https://docs.aws.amazon.com/iot/latest/developerguide/connect-iot-lorawan-define-profiles.html>`__ in the *AWS IoT Developers Guide*.
