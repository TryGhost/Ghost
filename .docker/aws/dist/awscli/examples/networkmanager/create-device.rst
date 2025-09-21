**To create a device**

The following ``create-device`` example creates a device in the specified global network. The device details include a description, the type, vendor, model, and serial number. ::

    aws networkmanager create-device  
        --global-network-id global-network-01231231231231231 \
        --description "New York office device" \
        --type "office device" \
        --vendor "anycompany" \
        --model "abcabc" \
        --serial-number "1234" \
        --region us-west-2

Output::

    {
        "Device": {
            "DeviceId": "device-07f6fd08867abc123",
            "DeviceArn": "arn:aws:networkmanager::123456789012:device/global-network-01231231231231231/device-07f6fd08867abc123",
            "GlobalNetworkId": "global-network-01231231231231231",
            "Description": "New York office device",
            "Type": "office device",
            "Vendor": "anycompany",
            "Model": "abcabc",
            "SerialNumber": "1234",
            "CreatedAt": 1575554005.0,
            "State": "PENDING"
        }
    }

For more information, see `Working with Devices <https://docs.aws.amazon.com/vpc/latest/tgw/on-premises-networks.html#working-with-devices>`__ in the *Transit Gateway Network Manager Guide*.
