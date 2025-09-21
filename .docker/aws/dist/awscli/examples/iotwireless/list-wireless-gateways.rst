**To list the wireless gateways**

The following ``list-wireless-gateways`` example lists the available wireless gateways in your AWS account. ::

    aws iotwireless list-wireless-gateways

Output::

    {
        "WirelessGatewayList": [
            {
                "Description": "My first LoRaWAN gateway", 
                "LoRaWAN": {
                    "RfRegion": "US915", 
                    "GatewayEui": "dac632ebc01d23e4"
                }, 
                "Id": "3039b406-5cc9-4307-925b-9948c63da25b", 
                "Arn": "arn:aws:iotwireless:us-east-1:123456789012:WirelessGateway/3039b406-5cc9-4307-925b-9948c63da25b", 
                "Name": "myFirstLoRaWANGateway"
            }, 
            {
                "Description": "My second LoRaWAN gateway", 
                "LoRaWAN": {
                    "RfRegion": "US915", 
                    "GatewayEui": "cda123fffe92ecd2"
                }, 
                "Id": "3285bdc7-5a12-4991-84ed-dadca65e342e", 
                "Arn": "arn:aws:iotwireless:us-east-1:123456789012:WirelessGateway/3285bdc7-5a12-4991-84ed-dadca65e342e", 
                "Name": "mySecondLoRaWANGateway"
            }
        ]
    }

For more information, see `Connecting devices and gateways to AWS IoT Core for LoRaWAN <https://docs.aws.amazon.com/iot/latest/developerguide/connect-iot-lorawan.html>`__ in the *AWS IoT Developers Guide*.
