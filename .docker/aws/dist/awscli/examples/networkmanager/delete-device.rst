**To delete a device**

The following ``delete-device`` example deletes the specified device from the specified global network. ::

    aws networkmanager delete-device \
        --global-network-id global-network-01231231231231231 \
        --device-id device-07f6fd08867abc123 \
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
            "SiteId": "site-444555aaabbb11223",
            "CreatedAt": 1575554005.0,
            "State": "DELETING"
        }
    }

For more information, see `Working with Devices <https://docs.aws.amazon.com/vpc/latest/tgw/on-premises-networks.html#working-with-devices>`__ in the *Transit Gateway Network Manager Guide*.
