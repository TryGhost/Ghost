**To list the service profiles**

The following ``list-service-profiles`` example lists the available service profiles registered to your AWS account. ::

    aws iotwireless list-service-profiles

Output::

    {
        "ServiceProfileList": [
            {
                "Id": "12345678-a1b2-3c45-67d8-e90fa1b2c34d", 
                "Arn": "arn:aws:iotwireless:us-east-1:123456789012:ServiceProfile/538185bb-d7e7-4b95-96a0-c51aa4a5b9a0"
            }, 
            {
                "Id": "a1b2c3d4-5678-90ab-cdef-12ab345c67de", 
                "Arn": "arn:aws:iotwireless:us-east-1:123456789012:ServiceProfile/ea8bc823-5d13-472e-8d26-9550737d8100"
            }
        ]
    }

For more information, see `Add profiles to AWS IoT Core for LoRaWAN <https://docs.aws.amazon.com/iot/latest/developerguide/connect-iot-lorawan-define-profiles.html>`__ in the *AWS IoT Developers Guide*.
