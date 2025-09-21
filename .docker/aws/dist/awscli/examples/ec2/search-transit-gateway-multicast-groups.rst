**To search one or more transit gateway multicast groups and return the group membership information**

The following ``search-transit-gateway-multicast-groups`` example returns the group membership of the specified multicast group. ::

    aws ec2 search-transit-gateway-multicast-groups \
        --transit-gateway-multicast-domain-id tgw-mcast-domain-000fb24d04EXAMPLE

Output::

    {
        "MulticastGroups": [
            {
                "GroupIpAddress": "224.0.1.0",
                "TransitGatewayAttachmentId": "tgw-attach-0372e72386EXAMPLE",
                "SubnetId": "subnet-0187aff814EXAMPLE",
                "ResourceId": "vpc-0065acced4EXAMPLE",
                "ResourceType": "vpc",
                "NetworkInterfaceId": "eni-03847706f6EXAMPLE",
                "GroupMember": false,
                "GroupSource": true,
                "SourceType": "static"
            }
        ]
    }

For more information, see `Multicast on transit gateways <https://docs.aws.amazon.com/vpc/latest/tgw/tgw-multicast-overview.html>`__ in the *Transit Gateways Guide*.
