**To get information about the wireless gateway task**

The following ``get-wireless-gateway-task`` example gets information about the wireless gateway task with the specified ID. ::

    aws iotwireless get-wireless-gateway-task \
        --id "11693a46-6866-47c3-a031-c9a616e7644b"

Output::

    {
        "WirelessGatewayId": "6c44ab31-8b4d-407a-bed3-19b6c7cda551",
        "WirelessGatewayTaskDefinitionId": "b7d3baad-25c7-35e7-a4e1-1683a0d61da9",
        "Status": "Success"
    }

For more information, see `Connecting devices and gateways to AWS IoT Core for LoRaWAN <https://docs.aws.amazon.com/iot/latest/developerguide/connect-iot-lorawan.html>`__ in the *AWS IoT Developers Guide*.