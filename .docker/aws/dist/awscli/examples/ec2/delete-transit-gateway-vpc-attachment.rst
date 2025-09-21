**To delete a transit gateway VPC attachment**

The following ``delete-transit-gateway-vpc-attachment`` example deletes the specified VPC attachment. ::

    aws ec2 delete-transit-gateway-vpc-attachment \
        --transit-gateway-attachment-id tgw-attach-0d2c54bdbEXAMPLE

Output::

    {
        "TransitGatewayVpcAttachment": {
            "TransitGatewayAttachmentId": "tgw-attach-0d2c54bdb3EXAMPLE",
            "TransitGatewayId": "tgw-02f776b1a7EXAMPLE",
            "VpcId": "vpc-0065acced4f61c651",
            "VpcOwnerId": "111122223333",
            "State": "deleting",
            "CreationTime": "2019-07-17T16:04:27.000Z"
        }
    }

For more information, see `Delete a VPC attachment <https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html#delete-vpc-attachment>`__ in the *Transit Gateways Guide*.