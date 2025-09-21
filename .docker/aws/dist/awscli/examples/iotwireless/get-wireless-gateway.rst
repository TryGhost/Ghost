**To get information about a wireless gateway**

The following ``get-wireless-gateway`` example gets information about the wireless gateway ``myFirstLoRaWANGateway``. ::

    aws iotwireless get-wireless-gateway \
        --identifier "12345678-a1b2-3c45-67d8-e90fa1b2c34d" \
        --identifier-type WirelessGatewayId 

Output::

    {
        "Description": "My first LoRaWAN gateway", 
        "ThingArn": "arn:aws:iot:us-east-1:123456789012:thing/a1b2c3d4-5678-90ab-cdef-12ab345c67de", 
        "LoRaWAN": {
            "RfRegion": "US915", 
            "GatewayEui": "a1b2c3d4567890ab"
        }, 
        "ThingName": "a1b2c3d4-5678-90ab-cdef-12ab345c67de", 
        "Id": "12345678-a1b2-3c45-67d8-e90fa1b2c34d", 
        "Arn": "arn:aws:iotwireless:us-east-1:123456789012:WirelessGateway/6c44ab31-8b4d-407a-bed3-19b6c7cda551", 
        "Name": "myFirstLoRaWANGateway"
    }

For more information, see `Connecting devices and gateways to AWS IoT Core for LoRaWAN <https://docs.aws.amazon.com/iot/latest/developerguide/connect-iot-lorawan.html>`__ in the *AWS IoT Developers Guide*.
