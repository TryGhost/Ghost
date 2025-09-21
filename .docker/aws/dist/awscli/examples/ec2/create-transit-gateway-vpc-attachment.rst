**Example 1: To associate a transit gateway with a VPC**

The following ``create-transit-gateway-vpc-attachment`` example creates a transit gateway attachment to the specified VPC. ::

    aws ec2 create-transit-gateway-vpc-attachment \
        --transit-gateway-id tgw-0262a0e521EXAMPLE \
        --vpc-id vpc-07e8ffd50f49335df \
        --subnet-id subnet-0752213d59EXAMPLE

Output::

    {
        "TransitGatewayVpcAttachment": {
            "TransitGatewayAttachmentId": "tgw-attach-0a34fe6b4fEXAMPLE",
            "TransitGatewayId": "tgw-0262a0e521EXAMPLE",
            "VpcId": "vpc-07e8ffd50fEXAMPLE",
            "VpcOwnerId": "111122223333",
            "State": "pending",
            "SubnetIds": [
                "subnet-0752213d59EXAMPLE"
            ],
            "CreationTime": "2019-07-10T17:33:46.000Z",
            "Options": {
                "DnsSupport": "enable",
                "Ipv6Support": "disable"
            }
        }
    }

For more information, see `Create a transit gateway attachment to a VPC <https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html#create-vpc-attachment>`__ in the *Transit Gateways Guide*.

**Example 2: To associate a transit gateway with multiple subnets in a VPC**

The following ``create-transit-gateway-vpc-attachment`` example creates a transit gateway attachment to the specified VPC and subnets. ::

    aws ec2 create-transit-gateway-vpc-attachment \
        --transit-gateway-id tgw-02f776b1a7EXAMPLE  \
        --vpc-id vpc-3EXAMPLE \
        --subnet-ids "subnet-dEXAMPLE" "subnet-6EXAMPLE" 

Output::

    {
        "TransitGatewayVpcAttachment": {
            "TransitGatewayAttachmentId": "tgw-attach-0e141e0bebEXAMPLE",
            "TransitGatewayId": "tgw-02f776b1a7EXAMPLE",
            "VpcId": "vpc-3EXAMPLE",
            "VpcOwnerId": "111122223333",
            "State": "pending",
            "SubnetIds": [
                "subnet-6EXAMPLE",
                "subnet-dEXAMPLE"
            ],
            "CreationTime": "2019-12-17T20:07:52.000Z",
            "Options": {
                "DnsSupport": "enable",
                "Ipv6Support": "disable"
            }
        }
    }

For more information, see `Create a transit gateway attachment to a VPC <https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html#create-vpc-attachment>`__ in the *Transit Gateways Guide*.