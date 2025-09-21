**To update a VPC link**

The following ``update-vpc-link`` example updates the name of a VPC link. After you've created a VPC link, you can't change its security groups or subnets. ::

    aws apigatewayv2 update-vpc-link \
        --vpc-link-id abcd123 \
        --name MyUpdatedVpcLink

Output::

    {
        "CreatedDate": "2020-04-07T00:27:47Z",
        "Name": "MyUpdatedVpcLink",
        "SecurityGroupIds": [
            "sg1234",
            "sg5678"
        ],
        "SubnetIds": [
            "subnet-aaaa",
            "subnet-bbbb"
        ],
        "Tags": {},
        "VpcLinkId": "abcd123",
        "VpcLinkStatus": "AVAILABLE",
        "VpcLinkStatusMessage": "VPC link is ready to route traffic",
        "VpcLinkVersion": "V2"
    }

For more information, see `Working with VPC links for HTTP APIs <https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vpc-links.html>`__ in the *Amazon API Gateway Developer Guide*.
