**To create the task for a wireless gateway**

The following ``create-wireless-gateway-task`` example creates a task for a wireless gateway. ::

    aws iotwireless create-wireless-gateway-task \
        --id "12345678-a1b2-3c45-67d8-e90fa1b2c34d" \
        --wireless-gateway-task-definition-id "aa000102-0304-b0cd-ef56-a1b23cde456a"

Output::

    {
        "WirelessGatewayTaskDefinitionId": "aa204003-0604-30fb-ac82-a4f95aaf450a",
        "Status": "Success"
    }

For more information, see `Connecting devices and gateways to AWS IoT Core for LoRaWAN <https://docs.aws.amazon.com/iot/latest/developerguide/connect-iot-lorawan.html>`__ in the *AWS IoT Developers Guide*.