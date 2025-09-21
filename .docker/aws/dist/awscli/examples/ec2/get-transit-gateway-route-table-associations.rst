**To get information about the associations for the specified transit gateway route table**

The following ``get-transit-gateway-route-table-associations`` example displays information about the associations for the specified transit gateway route table. ::

    aws ec2 get-transit-gateway-route-table-associations \
        --transit-gateway-route-table-id tgw-rtb-0a823edbdeEXAMPLE

Output::

    {
        "Associations": [
            {
                "TransitGatewayAttachmentId": "tgw-attach-09b52ccdb5EXAMPLE",
                "ResourceId": "vpc-4d7de228",
                "ResourceType": "vpc",
                "State": "associating"
            }
        ]
    }

For more information, see `Transit gateway route tables <https://docs.aws.amazon.com/vpc/latest/tgw/tgw-route-tables.html#associate-tgw-route-table>`__ in the *Transit Gateways Guide*.