**To delete a CIDR block from a route table**

The following ``delete-transit-gateway-route`` example deletes the CIDR block from the specified transit gateway route table. ::

    aws ec2 delete-transit-gateway-route \
        --transit-gateway-route-table-id tgw-rtb-0b6f6aaa01EXAMPLE \
        --destination-cidr-block 10.0.2.0/24

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
            "State": "deleted"
        }
    }

For more information, see `Delete a static route <https://docs.aws.amazon.com/vpc/latest/tgw/tgw-route-tables.html#tgw-delete-static-route>`__ in the *Transit Gateways Guide*.