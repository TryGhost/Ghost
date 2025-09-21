**To specify a tag key and value for a resource**

The following ``tag-resource`` example tags the wireless destination ``IoTWirelessDestination`` with the key ``MyTag`` and value ``MyValue``. ::

    aws iotwireless tag-resource \
        --resource-arn "arn:aws:iotwireless:us-east-1:651419225604:Destination/IoTWirelessDestination" \
        --tags Key="MyTag",Value="MyValue" 

This command produces no output.

For more information, see `Describe your AWS IoT Core for LoRaWAN resources <https://docs.aws.amazon.com/iot/latest/developerguide/connect-iot-lorawan-describe-resource.html>`__ in the *AWS IoT Developers Guide*.