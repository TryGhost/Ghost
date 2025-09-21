**To delete a DB proxy for an RDS database**

The following ``delete-db-proxy`` example deletes a DB proxy. ::

    aws rds delete-db-proxy \
        --db-proxy-name proxyExample

Output::

    {
            "DBProxy": 
            {
                "DBProxyName": "proxyExample",
                "DBProxyArn": "arn:aws:rds:us-east-1:123456789012:db-proxy:prx-0123a01b12345c0ab",
                "Status": "deleting",
                "EngineFamily": "PostgreSQL",
                "VpcId": "vpc-1234567",
                "VpcSecurityGroupIds": [
                    "sg-1234", 
                    "sg-5678"
                ],
                "VpcSubnetIds": [
                    "subnetgroup1", 
                    "subnetgroup2" 
                ],
                "Auth": "[
                    {
                    "Description": "proxydescription`"
                    "AuthScheme": "SECRETS",
                    "SecretArn": "arn:aws:secretsmanager:us-west-2:123456789123:secret:proxysecret1-Abcd1e",
                    "IAMAuth": "DISABLED"
                    } ],
                "RoleArn": "arn:aws:iam::12345678912:role/ProxyPostgreSQLRole",
                "Endpoint": "proxyExample.proxy-ab0cd1efghij.us-east-1.rds.amazonaws.com",
                "RequireTLS": false,
                "IdleClientTimeout": 1800,
                "DebuggingLogging": false,
            "CreatedDate": "2023-04-05T16:09:33.452000+00:00",
            "UpdatedDate": "2023-04-13T01:49:38.568000+00:00"
        }
    }

For more information, see `Deleting an RDS Proxy <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-managing.html#rds-proxy-deleting>`__ in the *Amazon RDS User Guide* and `Deleting an RDS Proxy <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/rds-proxy-managing.html#rds-proxy-deleting>`__ in the *Amazon Aurora User Guide*.