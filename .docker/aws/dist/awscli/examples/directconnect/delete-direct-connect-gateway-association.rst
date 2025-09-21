**To delete a Direct Connect gateway association**

The following ``delete-direct-connect-gateway-association`` example deletes the Direct Connect gateway association with a transit gateway that has the specified association ID. ::

    aws directconnect delete-direct-connect-gateway-association --association-id  be85116d-46eb-4b43-a27a-da0c2ad648de

Output::

    {
        "directConnectGatewayAssociation": {
            "directConnectGatewayId": "11460968-4ac1-4fd3-bdb2-00599EXAMPlE",
            "directConnectGatewayOwnerAccount": "123456789012",
            "associationState": "disassociating",
            "associatedGateway": {
                "id": "tgw-095b3b0b54EXAMPLE",
                "type": "transitGateway",
                "ownerAccount": "123456789012",
                "region": "us-east-1"
           },
            "associationId": " be85116d-46eb-4b43-a27a-da0c2ad648deEXAMPLE ",
            "allowedPrefixesToDirectConnectGateway": [
                {
                    "cidr": "192.0.1.0/28"
                }
            ]
        }
    }

For more information, see `Associating and Disassociating Transit Gateways <https://docs.aws.amazon.com/directconnect/latest/UserGuide/direct-connect-transit-gateways.html#associate-tgw-with-direct-connect-gateway>`_ in the *AWS Direct Connect User Guide*.
