**To describe a DB proxy endpoints**

The following ``describe-db-proxy-endpoints`` example returns information about DB proxy endpoints. ::

    aws rds describe-db-proxy-endpoints

Output::

    {
        "DBProxyEndpoints": [
            {
                "DBProxyEndpointName": "proxyEndpoint1",
                "DBProxyEndpointArn": "arn:aws:rds:us-east-1:123456789012:db-proxy-endpoint:prx-endpoint-0123a01b12345c0ab",
                "DBProxyName": "proxyExample",
                "Status": "available",
                "VpcId": "vpc-1234567",
                "VpcSecurityGroupIds": [
                    "sg-1234"
                ],
                "VpcSubnetIds": [
                    "subnetgroup1", 
                    "subnetgroup2" 
                ],
                "Endpoint": "proxyEndpoint1.endpoint.proxy-ab0cd1efghij.us-east-1.rds.amazonaws.com",
                "CreatedDate": "2023-04-05T16:09:33.452000+00:00",
                "TargetRole": "READ_WRITE",
                "IsDefault": false
            },
            {
                "DBProxyEndpointName": "proxyEndpoint2",
                "DBProxyEndpointArn": "arn:aws:rds:us-east-1:123456789012:db-proxy-endpoint:prx-endpoint-4567a01b12345c0ab",
                "DBProxyName": "proxyExample2",
                "Status": "available",
                "VpcId": "vpc1234567",
                "VpcSecurityGroupIds": [
                    "sg-5678"
                ],
                "VpcSubnetIds": [
                    "subnetgroup1", 
                    "subnetgroup2" 
                ],
                "Endpoint": "proxyEndpoint2.endpoint.proxy-cd1ef2klmnop.us-east-1.rds.amazonaws.com",
                "CreatedDate": "2023-04-05T16:09:33.452000+00:00",
                "TargetRole": "READ_WRITE",
                "IsDefault": false
            }
        ]
    }

For more information, see `Viewing a proxy endpoint <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-endpoints.html#rds-proxy-endpoints.DescribingEndpoint>`__ in the *Amazon RDS User Guide* and `Creating a proxy endpoint <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/rds-proxy-endpoints.html#rds-proxy-endpoints.DescribingEndpoint>`__ in the *Amazon Aurora User Guide*.