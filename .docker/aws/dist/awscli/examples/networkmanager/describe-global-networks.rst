**To describe your global networks**

The following ``describe-global-networks`` example describes all of your global networks in your account. ::

    aws networkmanager describe-global-networks \
        --region us-west-2

Output::

    {
        "GlobalNetworks": [
            {
                "GlobalNetworkId": "global-network-01231231231231231",
                "GlobalNetworkArn": "arn:aws:networkmanager::123456789012:global-network/global-network-01231231231231231",
                "Description": "Company 1 global network",
                "CreatedAt": 1575553525.0,
                "State": "AVAILABLE"
            }
        ]
    }
