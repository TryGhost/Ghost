**To update the specified attributes of the Direct Connect gateway association**

The following ``update-direct-connect-gateway-association`` example adds the specified CIDR block to a Direct Connect gateway association. ::

    aws directconnect update-direct-connect-gateway-association \
        --association-id 820a6e4f-5374-4004-8317-3f64bEXAMPLE \
        --add-allowed-prefixes-to-direct-connect-gateway cidr=192.168.2.0/30

Output::

    {
        "directConnectGatewayAssociation": {
            "directConnectGatewayId": "11460968-4ac1-4fd3-bdb2-00599EXAMPLE",
            "directConnectGatewayOwnerAccount": "111122223333",
            "associationState": "updating",
            "associatedGateway": {
                "id": "tgw-02f776b1a7EXAMPLE",
                "type": "transitGateway",
                "ownerAccount": "111122223333",
                "region": "us-east-1"
            },
            "associationId": "820a6e4f-5374-4004-8317-3f64bEXAMPLE",
            "allowedPrefixesToDirectConnectGateway": [
                {
                    "cidr": "192.168.2.0/30"
                },
                {
                    "cidr": "192.168.1.0/30"
                }
            ]
        }
    }

For more information, see `Working with Direct Connect Gateways <https://docs.aws.amazon.com/directconnect/latest/UserGuide/direct-connect-gateways.html>`__ in the *AWS Direct Connect User Guide*.
