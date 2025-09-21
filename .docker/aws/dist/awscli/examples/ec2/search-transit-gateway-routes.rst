**To search for routes in the specified transit gateway route table**

The following ``search-transit-gateway-routes`` example returns all the routes that are of type ``static`` in the specified route table. ::

    aws ec2 search-transit-gateway-routes \
        --transit-gateway-route-table-id tgw-rtb-0a823edbdeEXAMPLE \
        --filters "Name=type,Values=static"

Output::

    {
        "Routes": [
            {
                "DestinationCidrBlock": "10.0.2.0/24",
                "TransitGatewayAttachments": [
                    {
                        "ResourceId": "vpc-4EXAMPLE",
                        "TransitGatewayAttachmentId": "tgw-attach-09b52ccdb5EXAMPLE",
                        "ResourceType": "vpc"
                    }
                ],
                "Type": "static",
                "State": "active"
            },
            {
                "DestinationCidrBlock": "10.1.0.0/24",
                "TransitGatewayAttachments": [
                    {
                        "ResourceId": "vpc-4EXAMPLE",
                        "TransitGatewayAttachmentId": "tgw-attach-09b52ccdb5EXAMPLE",
                        "ResourceType": "vpc"
                    }
                ],
                "Type": "static",
                "State": "active"
            }
        ],
        "AdditionalRoutesAvailable": false
    }

For more information, see `Transit gateway route tables <https://docs.aws.amazon.com/vpc/latest/tgw/tgw-route-tables.html>`__ in the *Transit Gateways Guide*.