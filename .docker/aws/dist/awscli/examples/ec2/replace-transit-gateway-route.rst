**To replace the specified route in the specified transit gateway route table**

The following ``replace-transit-gateway-route`` example replaces the route in the specified transit gateway route table. ::

    aws ec2 replace-transit-gateway-route \
        --destination-cidr-block 10.0.2.0/24 \
        --transit-gateway-attachment-id tgw-attach-09b52ccdb5EXAMPLE \
        --transit-gateway-route-table-id tgw-rtb-0a823edbdeEXAMPLE

Output::

    {
        "Route": {
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
        }
    }

For more information, see `Transit gateway route tables <https://docs.aws.amazon.com/vpc/latest/tgw/tgw-route-tables.html>`__ in the *Transit Gateways Guide*.