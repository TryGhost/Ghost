**To update the properties of a wireless device**

The following ``update-wireless-device`` example updates the properties of a wireless device registered to your AWS account. ::

    aws iotwireless update-wireless-device \
        --id "1ffd32c8-8130-4194-96df-622f072a315f" \
        --destination-name IoTWirelessDestination2 \
        --description "Using my first LoRaWAN device"

This command produces no output.

For more information, see `Connecting devices and gateways to AWS IoT Core for LoRaWAN <https://docs.aws.amazon.com/iot/latest/developerguide/connect-iot-lorawan.html>`__ in the *AWS IoT Developers Guide*.