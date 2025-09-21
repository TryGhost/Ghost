**To get operating information about a wireless gateway**

The following ``get-wireless-gateway-statistics`` example gets operating information about a wireless gateway. ::

    aws iotwireless get-wireless-gateway-statistics \
        --wireless-gateway-id "3039b406-5cc9-4307-925b-9948c63da25b"

Output::

    {
        "WirelessGatewayId": "3039b406-5cc9-4307-925b-9948c63da25b"
    }

For more information, see `Connecting devices and gateways to AWS IoT Core for LoRaWAN <https://docs.aws.amazon.com/iot/latest/developerguide/connect-iot-lorawan.html>`__ in the *AWS IoT Developers Guide*.
