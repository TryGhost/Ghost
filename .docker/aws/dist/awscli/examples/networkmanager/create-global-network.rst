**To create a global network**

The following ``create-global-network`` examples creates a new global network. The initial state upon creation is ``PENDING``. ::

    aws networkmanager create-global-network

Output::

    {
        "GlobalNetwork": {
            "GlobalNetworkId": "global-network-00a77fc0f722dae74",
            "GlobalNetworkArn": "arn:aws:networkmanager::987654321012:global-network/global-network-00a77fc0f722dae74",
            "CreatedAt": "2022-03-14T20:31:56+00:00",
            "State": "PENDING"
        }
    }
