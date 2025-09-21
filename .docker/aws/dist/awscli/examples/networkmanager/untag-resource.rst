**To remove tags from a resource**

The following ``untag-resource`` example removes the tag with the key ``Network`` from the device ``device-07f6fd08867abc123``. ::

    aws networkmanager untag-resource \
        --resource-arn arn:aws:networkmanager::123456789012:device/global-network-01231231231231231/device-07f6fd08867abc123 ]
        --tag-keys Network \
        --region us-west-2

This command produces no output.