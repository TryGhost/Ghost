**To update the properties of a destination**

The following ``update-destination`` example updates the description property of a wireless destination. ::

    aws iotwireless update-destination \
        --name "IoTWirelessDestination" \
        --description "Destination for messages processed using IoTWirelessRule"

This command produces no output.

For more information, see `Add destinations to AWS IoT Core for LoRaWAN <https://docs.aws.amazon.com/iot/latest/developerguide/connect-iot-lorawan-create-destinations.html>`__ in the *AWS IoT Developers Guide*.