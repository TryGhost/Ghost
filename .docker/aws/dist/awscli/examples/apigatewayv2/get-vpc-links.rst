**To retrieve a list of VPC links**

The following ``get-vpc-links`` example displays a list of all of the VPC links for the current user. ::

    aws apigatewayv2 get-vpc-links

Output::

    {
        "Items": [
            {
                "CreatedDate": "2020-04-07T00:27:47Z",
                "Name": "MyVpcLink",
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
            {
                "CreatedDate": "2020-04-07T00:27:47Z",
                "Name": "MyOtherVpcLink",
                "SecurityGroupIds": [
                    "sg1234",
                    "sg5678"
                ],
                "SubnetIds": [
                    "subnet-aaaa",
                    "subnet-bbbb"
                ],
                "Tags": {},
                "VpcLinkId": "abcd456",
                "VpcLinkStatus": "AVAILABLE",
                "VpcLinkStatusMessage": "VPC link is ready to route traffic",
                "VpcLinkVersion": "V2"
            }
        ]
    }

For more information, see `Working with VPC links for HTTP APIs <https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vpc-links.html>`__ in the *Amazon API Gateway Developer Guide*.
