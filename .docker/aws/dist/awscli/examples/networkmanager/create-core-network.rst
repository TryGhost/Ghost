**To create a core network**

The following ``create-core-network`` example creates a core network using an optional description and tags within an AWS Cloud WAN global network. ::

    aws networkmanager create-core-network \
        --global-network-id global-network-0d59060f16a73bc41\
        --description "Main headquarters location"\
        --tags Key=Name,Value="New York City office"

Output::

    {
        "CoreNetwork": {
            "GlobalNetworkId": "global-network-0d59060f16a73bc41",
            "CoreNetworkId": "core-network-0fab62fe438d94db6",
            "CoreNetworkArn": "arn:aws:networkmanager::987654321012:core-network/core-network-0fab62fe438d94db6",
            "Description": "Main headquarters location",
            "CreatedAt": "2022-01-10T19:53:59+00:00",
            "State": "AVAILABLE",
            "Tags": [
                {
                    "Key": "Name",
                    "Value": "New York City office"
                }
            ]
        }
    }

For more information, see `Core networks <https://docs.aws.amazon.com/AWSEC2vpc/latest/cloudwan/cloudwan-networks-working-with.html#cloudwan-core-networks>`__ in the *AWS Cloud WAN User Guide*.