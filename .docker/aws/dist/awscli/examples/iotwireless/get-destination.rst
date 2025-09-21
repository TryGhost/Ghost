**To get information about an IoT wireless destination**

The following ``get-destination`` example gets information about the destination resource with the name ``IoTWirelessDestination`` that you created. ::

    aws iotwireless get-destination \
        --name "IoTWirelessDestination"

Output::

    {
        "Arn": "arn:aws:iotwireless:us-east-1:123456789012:Destination/IoTWirelessDestination",
        "Name": "IoTWirelessDestination",
        "Expression": "IoTWirelessRule",
        "ExpressionType": "RuleName",
        "RoleArn": "arn:aws:iam::123456789012:role/IoTWirelessDestinationRole"
    }

For more information, see `Add destinations to AWS IoT Core for LoRaWAN <https://docs.aws.amazon.com/iot/latest/developerguide/connect-iot-lorawan-create-destinations.html>`__ in the *AWS IoT Developers Guide*.
