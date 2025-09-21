**To describe your Direct Connect gateway association proposals**

The following ``describe-direct-connect-gateway-association-proposals`` example displays details about your Direct Connect gateway association proposals. ::

    aws directconnect describe-direct-connect-gateway-association-proposals

Output::

    {
        "directConnectGatewayAssociationProposals": [
            {
                "proposalId": "c2ede9b4-bbc6-4d33-923c-bc4feEXAMPLE",
                "directConnectGatewayId": "11460968-4ac1-4fd3-bdb2-00599EXAMPLE",
                "directConnectGatewayOwnerAccount": "111122223333",
                "proposalState": "requested",
                "associatedGateway": {
                    "id": "tgw-02f776b1a7EXAMPLE",
                    "type": "transitGateway",
                    "ownerAccount": "111122223333",
                    "region": "us-east-1"
                },
                "existingAllowedPrefixesToDirectConnectGateway": [
                    {
                        "cidr": "192.168.2.0/30"
                    },
                    {
                        "cidr": "192.168.1.0/30"
                    }
                ],
                "requestedAllowedPrefixesToDirectConnectGateway": [
                    {
                        "cidr": "192.168.1.0/30"
                    }
                ]
            },
            {
                "proposalId": "cb7f41cb-8128-43a5-93b1-dcaedEXAMPLE",
                "directConnectGatewayId": "11560968-4ac1-4fd3-bcb2-00599EXAMPLE",
                "directConnectGatewayOwnerAccount": "111122223333",
                "proposalState": "accepted",
                "associatedGateway": {
                    "id": "tgw-045776b1a7EXAMPLE",
                    "type": "transitGateway",
                    "ownerAccount": "111122223333",
                    "region": "us-east-1"
                },
                "existingAllowedPrefixesToDirectConnectGateway": [
                    {
                        "cidr": "192.168.4.0/30"
                    },
                    {
                        "cidr": "192.168.5.0/30"
                    }
                ],
                "requestedAllowedPrefixesToDirectConnectGateway": [
                    {
                        "cidr": "192.168.5.0/30"
                    }
                ]
            }
        ]
    }

For more information, see `Associating and Disassociating Transit Gateways <https://docs.aws.amazon.com/directconnect/latest/UserGuide/direct-connect-transit-gateways.html#associate-tgw-with-direct-connect-gateway>`__ in the *AWS Direct Connect User Guide*.
