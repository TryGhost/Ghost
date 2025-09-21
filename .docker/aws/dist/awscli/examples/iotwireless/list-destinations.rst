**To list the wireless destinations**

The following ``list-destinations`` example lists the available destinations registered to your AWS account. ::

    aws iotwireless list-destinations

Output::

    {
        "DestinationList": [
            {
                "Arn": "arn:aws:iotwireless:us-east-1:123456789012:Destination/IoTWirelessDestination",
                "Name": "IoTWirelessDestination",
                "Expression": "IoTWirelessRule",
                "Description": "Destination for messages processed using IoTWirelessRule",
                "RoleArn": "arn:aws:iam::123456789012:role/IoTWirelessDestinationRole"
            },
            {
                "Arn": "arn:aws:iotwireless:us-east-1:123456789012:Destination/IoTWirelessDestination2",
                "Name": "IoTWirelessDestination2",
                "Expression": "IoTWirelessRule2",
                "RoleArn": "arn:aws:iam::123456789012:role/IoTWirelessDestinationRole"
            }
        ]
    }

For more information, see `Add destinations to AWS IoT Core for LoRaWAN <https://docs.aws.amazon.com/iot/latest/developerguide/connect-iot-lorawan-create-destinations.html>`__ in the *AWS IoT Developers Guide*.