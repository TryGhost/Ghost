**To create a proposal to associate the specified transit gateway with the specified Direct Connect gateway**

The following ``create-direct-connect-gateway-association-proposal`` example creates a proposal that associates the specified transit gateway with the specified Direct Connect gateway. ::

    aws directconnect create-direct-connect-gateway-association-proposal \
        --direct-connect-gateway-id 11460968-4ac1-4fd3-bdb2-00599EXAMPLE \
        --direct-connect-gateway-owner-account 111122223333 \
        --gateway-id tgw-02f776b1a7EXAMPLE \
        --add-allowed-prefixes-to-direct-connect-gateway cidr=192.168.1.0/30

Output::

    {
        "directConnectGatewayAssociationProposal": {
            "proposalId": "cb7f41cb-8128-43a5-93b1-dcaedEXAMPLE",
            "directConnectGatewayId": "11460968-4ac1-4fd3-bdb2-00599EXAMPLE",
            "directConnectGatewayOwnerAccount": "111122223333",
            "proposalState": "requested",
            "associatedGateway": {
                "id": "tgw-02f776b1a7EXAMPLE",
                "type": "transitGateway",
                "ownerAccount": "111122223333",
                "region": "us-east-1"
            },
            "requestedAllowedPrefixesToDirectConnectGateway": [
                {
                    "cidr": "192.168.1.0/30"
                }
            ]
        }
    }

For more information, see `Creating a Transit Gateway Association Proposal <https://docs.aws.amazon.com/directconnect/latest/UserGuide/multi-account-associate-tgw.html#multi-account-tgw-create-proposal>`__ in the *AWS Direct Connect User Guide*.
