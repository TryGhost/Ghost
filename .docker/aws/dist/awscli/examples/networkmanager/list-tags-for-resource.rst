**To list the tags for a resource**

The following ``list-tags-for-resource`` example lists the tags for the specified device resource (``device-07f6fd08867abc123``). ::

    aws networkmanager list-tags-for-resource \
        --resource-arn arn:aws:networkmanager::123456789012:device/global-network-01231231231231231/device-07f6fd08867abc123 \
        --region us-west-2

Output::

    {
        "TagList": [
            {
                "Key": "Network",
                "Value": "Northeast"
            }
        ]
    }
