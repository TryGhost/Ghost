**To get your devices**

The following ``get-devices`` example gets the devices in the specified global network. ::

    aws networkmanager get-devices \
        --global-network-id global-network-01231231231231231 \
        --region us-west-2

Output::

    {
        "Devices": [
            {
                "DeviceId": "device-07f6fd08867abc123",
                "DeviceArn": "arn:aws:networkmanager::123456789012:device/global-network-01231231231231231/device-07f6fd08867abc123",
                "GlobalNetworkId": "global-network-01231231231231231",
                "Description": "NY office device",
                "Type": "office device",
                "Vendor": "anycompany",
                "Model": "abcabc",
                "SerialNumber": "1234",
                "CreatedAt": 1575554005.0,
                "State": "AVAILABLE"
            }
        ]
    }
