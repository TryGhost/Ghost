**To delete a DB proxy endpoint for an RDS database**

The following ``delete-db-proxy-endpoint`` example deletes a DB proxy endpoint for the target database. ::

    aws rds delete-db-proxy-endpoint \
        --db-proxy-endpoint-name proxyEP1

Output::

    {
    "DBProxyEndpoint": 
        {
            "DBProxyEndpointName": "proxyEP1",
            "DBProxyEndpointArn": "arn:aws:rds:us-east-1:123456789012:db-proxy-endpoint:prx-endpoint-0123a01b12345c0ab",
            "DBProxyName": "proxyExample",
            "Status": "deleting",
            "VpcId": "vpc-1234567",
            "VpcSecurityGroupIds": [
                "sg-1234", 
                "sg-5678"
            ],
            "VpcSubnetIds": [
                "subnetgroup1", 
                "subnetgroup2" 
            ],
            "Endpoint": "proxyEP1.endpoint.proxy-ab0cd1efghij.us-east-1.rds.amazonaws.com",
            "CreatedDate": "2023-04-13T01:49:38.568000+00:00",
            "TargetRole": "READ_ONLY",
            "IsDefault": false
        }
    }

For more information, see `Deleting a proxy endpoint <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-endpoints.html#rds-proxy-endpoints.DeletingEndpoint>`__ in the *Amazon RDS User Guide* and `Deleting a proxy endpoint <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/rds-proxy-endpoints.html#rds-proxy-endpoints.DeletingEndpoint>`__ in the *Amazon Aurora User Guide*.