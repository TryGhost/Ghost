**To test the wireless device**

The following ``test-wireless-device`` example sends uplink data of ``Hello`` to a device with specified ID. ::

    aws iotwireless test-wireless-device \
        --id "11aa5eae-2f56-4b8e-a023-b28d98494e49"

Output::

    {
        Result: "Test succeeded. one message is sent with payload: hello"
    }

For more information, see `Connecting devices and gateways to AWS IoT Core for LoRaWAN <https://docs.aws.amazon.com/iot/latest/developerguide/connect-iot-lorawan.html>`__ in the *AWS IoT Developers Guide*.