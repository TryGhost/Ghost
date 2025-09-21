**To get information about the wireless device**

The following ``get-wireless-device`` example lists the available widgets in your AWS account. ::

    aws iotwireless get-wireless-device \
        --identifier "1ffd32c8-8130-4194-96df-622f072a315f" \
        --identifier-type WirelessDeviceID

Output::

    {
        "Name": "myLoRaWANDevice", 
        "ThingArn": "arn:aws:iot:us-east-1:123456789012:thing/44b87eb4-9bce-423d-b5fc-973f5ecc358b", 
        "DestinationName": "IoTWirelessDestination", 
        "Id": "1ffd32c8-8130-4194-96df-622f072a315f", 
        "ThingName": "44b87eb4-9bce-423d-b5fc-973f5ecc358b", 
        "Type": "LoRaWAN", 
        "LoRaWAN": {
            "DeviceProfileId": "ab0c23d3-b001-45ef-6a01-2bc3de4f5333", 
            "ServiceProfileId": "fe98dc76-cd12-001e-2d34-5550432da100", 
            "OtaaV1_1": {
                "AppKey": "3f4ca100e2fc675ea123f4eb12c4a012", 
                "JoinEui": "b4c231a359bc2e3d", 
                "NwkKey": "01c3f004a2d6efffe32c4eda14bcd2b4"
            }, 
            "DevEui": "ac12efc654d23fc2"
        }, 
        "Arn": "arn:aws:iotwireless:us-east-1:123456789012:WirelessDevice/1ffd32c8-8130-4194-96df-622f072a315f", 
        "Description": "My LoRaWAN wireless device"
    }

For more information, see `Connecting devices and gateways to AWS IoT Core for LoRaWAN <https://docs.aws.amazon.com/iot/latest/developerguide/connect-iot-lorawan.html>`__ in the *AWS IoT Developers Guide*.
