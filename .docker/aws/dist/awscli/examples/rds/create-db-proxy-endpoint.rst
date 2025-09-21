**To create a DB proxy endpoint for an RDS database**

The following ``create-db-proxy-endpoint`` example creates a DB proxy endpoint. ::

    aws rds create-db-proxy-endpoint \
        --db-proxy-name proxyExample \
        --db-proxy-endpoint-name "proxyep1" \
        --vpc-subnet-ids subnetgroup1 subnetgroup2

Output::

    {
    "DBProxyEndpoint": {
            "DBProxyEndpointName": "proxyep1",
            "DBProxyEndpointArn": "arn:aws:rds:us-east-1:123456789012:db-proxy-endpoint:prx-endpoint-0123a01b12345c0ab",
            "DBProxyName": "proxyExample",
            "Status": "creating",
            "VpcId": "vpc-1234567",
            "VpcSecurityGroupIds": [
                "sg-1234", 
                "sg-5678"
            ],
            "VpcSubnetIds": [
                "subnetgroup1", 
                "subnetgroup2" 
            ],
            "Endpoint": "proxyep1.endpoint.proxy-ab0cd1efghij.us-east-1.rds.amazonaws.com",
            "CreatedDate": "2023-04-05T16:09:33.452000+00:00",
            "TargetRole": "READ_WRITE",
            "IsDefault": false
        }
    }

For more information, see `Creating a proxy endpoint <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-endpoints.html#rds-proxy-endpoints.CreatingEndpoint>`__ in the *Amazon RDS User Guide* and `Creating a proxy endpoint <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/rds-proxy-endpoints.html#rds-proxy-endpoints.CreatingEndpoint>`__ in the *Amazon Aurora User Guide*.