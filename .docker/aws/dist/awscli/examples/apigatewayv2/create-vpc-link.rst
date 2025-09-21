**To create a VPC link for an HTTP API**

The following ``create-vpc-link`` example creates a VPC link for HTTP APIs. ::

    aws apigatewayv2 create-vpc-link \
        --name MyVpcLink \
        --subnet-ids subnet-aaaa subnet-bbbb \
        --security-group-ids sg1234 sg5678

Output::

    {
        "CreatedDate": "2020-04-07T00:11:46Z",
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
        "VpcLinkStatus": "PENDING",
        "VpcLinkStatusMessage": "VPC link is provisioning ENIs",
        "VpcLinkVersion": "V2"
    }

For more information, see `Working with VPC links for HTTP APIs <https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vpc-links.html>`__ in the *Amazon API Gateway Developer Guide*.
