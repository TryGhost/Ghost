**To update a global network**

The following ``update-global-network`` example updates the description for global network ``global-network-01231231231231231``. ::

    aws networkmanager update-global-network \
        --global-network-id global-network-01231231231231231 \
        --description "Head offices" \
        --region us-west-2

Output::

    {
        "GlobalNetwork": {
            "GlobalNetworkId": "global-network-01231231231231231",
            "GlobalNetworkArn": "arn:aws:networkmanager::123456789012:global-network/global-network-01231231231231231",
            "Description": "Head offices",
            "CreatedAt": 1575553525.0,
            "State": "UPDATING"
        }
    }

For more information, see `Global Networks <https://docs.aws.amazon.com/vpc/latest/tgw/global-networks.html>`__ in the *Transit Gateway Network Manager Guide*.
