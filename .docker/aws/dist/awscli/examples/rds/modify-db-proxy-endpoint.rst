**To modify a DB proxy endpoint for an RDS database**

The following ``modify-db-proxy-endpoint`` example modifies a DB proxy endpoint ``proxyEndpoint`` to set the read-timeout to 65 seconds. ::

    aws rds modify-db-proxy-endpoint \
        --db-proxy-endpoint-name proxyEndpoint \
        --cli-read-timeout 65

Output::

    {
    "DBProxyEndpoint": 
        {
            "DBProxyEndpointName": "proxyEndpoint",
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
            "Endpoint": "proxyEndpoint.endpoint.proxyExample-ab0cd1efghij.us-east-1.rds.amazonaws.com",
            "CreatedDate": "2023-04-05T16:09:33.452000+00:00",
            "TargetRole": "READ_WRITE",
            "IsDefault": "false"
        }
    }

For more information, see `Modifying a proxy endpoint <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-endpoints.html#rds-proxy-endpoints.ModifyingEndpoint>`__ in the *Amazon RDS User Guide* and `Modifying a proxy endpoint <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/rds-proxy-endpoints.html#rds-proxy-endpoints.ModifyingEndpoint>`__ in the *Amazon Aurora User Guide*.