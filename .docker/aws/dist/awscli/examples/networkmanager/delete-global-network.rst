**To delete a global network**

The following ``delete-global-network`` example deletes a global network. ::

    aws networkmanager delete-global-network \
        --global-network-id global-network-052bedddccb193b6b

Output::

    {
        "GlobalNetwork": {
            "GlobalNetworkId": "global-network-052bedddccb193b6b",
            "GlobalNetworkArn": "arn:aws:networkmanager::987654321012:global-network/global-network-052bedddccb193b6b",
            "CreatedAt": "2021-12-09T18:19:12+00:00",
            "State": "DELETING"
        }
    }
