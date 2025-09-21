**To create a transit gateway route**

The following ``create-transit-gateway-route`` example creates a route, with the specified destination, for the specified route table. ::

    aws ec2 create-transit-gateway-route \
        --destination-cidr-block 10.0.2.0/24 \
        --transit-gateway-route-table-id tgw-rtb-0b6f6aaa01EXAMPLE \
        --transit-gateway-attachment-id tgw-attach-0b5968d3b6EXAMPLE

Output::

    {
        "Route": {
            "DestinationCidrBlock": "10.0.2.0/24",
            "TransitGatewayAttachments": [
                {
                    "ResourceId": "vpc-0065acced4EXAMPLE",
                    "TransitGatewayAttachmentId": "tgw-attach-0b5968d3b6EXAMPLE",
                    "ResourceType": "vpc"
                }
            ],
            "Type": "static",
            "State": "active"
        }
    }

For more information, see `Transit gateway route tables <https://docs.aws.amazon.com/vpc/latest/tgw/tgw-route-tables.html>`__ in the *Transit Gateways Guide*.