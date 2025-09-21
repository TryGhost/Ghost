**To associate a  transit gateway route table with a transit gateway attachment**

The following example associates the specified transit gateway route table with the specified VPC attachment. ::

    aws ec2 associate-transit-gateway-route-table \
        --transit-gateway-route-table-id tgw-rtb-002573ed1eEXAMPLE \
        --transit-gateway-attachment-id tgw-attach-0b5968d3b6EXAMPLE

Output::

    {
        "Association": {
            "TransitGatewayRouteTableId": "tgw-rtb-002573ed1eEXAMPLE",
            "TransitGatewayAttachmentId": "tgw-attach-0b5968d3b6EXAMPLE",
            "ResourceId": "vpc-0065acced4EXAMPLE",
            "ResourceType": "vpc",
            "State": "associating"
        }
    }

For more information, see `Associate a Transit Gateway Route Table <https://docs.aws.amazon.com/vpc/latest/tgw/tgw-route-tables.html#associate-tgw-route-table>`__ in the *AWS Transit Gateways Guide*.
