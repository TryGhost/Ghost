**To associate a thing to a wireless gateway**

The following ``associate-wireless-gateway-with-thing`` example associates a thing to a wireless gateway. ::

    aws iotwireless associate-wireless-gateway-with-thing \
        --id "12345678-a1b2-3c45-67d8-e90fa1b2c34d" \
        --thing-arn "arn:aws:iot:us-east-1:123456789012:thing/MyIoTWirelessThing"

This command produces no output.

For more information, see `Add your gateways and wireless devices to AWS IoT Core for LoRaWAN <https://docs.aws.amazon.com/iot/latest/developerguide/connect-iot-lorawan-onboard-devices.html>`__ in the *AWS IoT Developers Guide*.