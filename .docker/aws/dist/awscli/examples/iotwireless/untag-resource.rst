**To remove one or more tags from a resource**

The following ``untag-resource`` example removes the tag ``MyTag`` and its value from the wireless destination ``IoTWirelessDestination``. ::

    aws iotwireless untag-resource \
        --resource-arn "arn:aws:iotwireless:us-east-1:123456789012:Destination/IoTWirelessDestination" \
        --tag-keys "MyTag"

This command produces no output.

For more information, see `Describe your AWS IoT Core for LoRaWAN resources <https://docs.aws.amazon.com/iot/latest/developerguide/connect-iot-lorawan-describe-resource.html>`__ in the *AWS IoT Developers Guide*.