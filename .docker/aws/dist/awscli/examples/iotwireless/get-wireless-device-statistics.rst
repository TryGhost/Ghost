**To get operating information about a wireless device**

The following ``get-wireless-device-statistics`` example gets operating information about a wireless device. ::

    aws iotwireless get-wireless-device-statistics \
        --wireless-device-id "1ffd32c8-8130-4194-96df-622f072a315f"

Output::

    {
        "WirelessDeviceId": "1ffd32c8-8130-4194-96df-622f072a315f"
    }

For more information, see `Connecting devices and gateways to AWS IoT Core for LoRaWAN <https://docs.aws.amazon.com/iot/latest/developerguide/connect-iot-lorawan.html>`__ in the *AWS IoT Developers Guide*.
