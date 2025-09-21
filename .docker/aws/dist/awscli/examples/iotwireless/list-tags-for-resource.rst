**To list the tags assigned to the resource**

The following ``list-tags-for-resource`` example lists the tags assigned to a wireless destination resource. ::

    aws iotwireless list-tags-for-resource \
        --resource-arn "arn:aws:iotwireless:us-east-1:123456789012:Destination/IoTWirelessDestination"

Output::

    {
        "Tags": [
            {
                "Value": "MyValue", 
                "Key": "MyTag"
            }
        ]
    }

For more information, see `Describe your AWS IoT Core for LoRaWAN resources <https://docs.aws.amazon.com/iot/latest/developerguide/connect-iot-lorawan-describe-resource.html>`__ in the *AWS IoT Developers Guide*.
