**To create an IoT wireless destination**

The following ``create-destination`` example creates a destination for mapping a device message to an AWS IoT rule. Before you run this command, you must have created an IAM role that gives AWS IoT Core for LoRaWAN the permissions necessary to send data to the AWS IoT rule. ::

    aws iotwireless create-destination \
        --name IoTWirelessDestination \
        --expression-type RuleName \
        --expression IoTWirelessRule \
        --role-arn arn:aws:iam::123456789012:role/IoTWirelessDestinationRole

Output::

    {
        "Arn": "arn:aws:iotwireless:us-east-1:123456789012:Destination/IoTWirelessDestination",
        "Name": "IoTWirelessDestination"
    }

For more information, see `Add destinations to AWS IoT Core for LoRaWAN <https://docs.aws.amazon.com/iot/latest/developerguide/connect-iot-lorawan-create-destinations.html>`__ in the *AWS IoT Developers Guide*.