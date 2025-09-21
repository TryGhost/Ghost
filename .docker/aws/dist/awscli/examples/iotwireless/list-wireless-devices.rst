**To list the available wireless devices**

The following ``list-wireless-devices`` example lists the available wireless devices registered to your AWS account. ::

    aws iotwireless list-wireless-devices

Output::

    {
        "WirelessDeviceList": [
            {
                "Name": "myLoRaWANDevice", 
                "DestinationName": "IoTWirelessDestination", 
                "Id": "1ffd32c8-8130-4194-96df-622f072a315f", 
                "Type": "LoRaWAN", 
                "LoRaWAN": {
                    "DevEui": "ac12efc654d23fc2"
                }, 
                "Arn": "arn:aws:iotwireless:us-east-1:123456789012:WirelessDevice/1ffd32c8-8130-4194-96df-622f072a315f"
            }
        ]
    }

For more information, see `Connecting devices and gateways to AWS IoT Core for LoRaWAN <https://docs.aws.amazon.com/iot/latest/developerguide/connect-iot-lorawan.html>`__ in the *AWS IoT Developers Guide*.
