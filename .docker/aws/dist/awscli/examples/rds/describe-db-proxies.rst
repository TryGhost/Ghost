**To describe a DB proxy for an RDS database**

The following ``describe-db-proxies`` example returns information about DB proxies. ::

    aws rds describe-db-proxies

Output::

    {
        "DBProxies": [
            {
                "DBProxyName": "proxyExample1",
                "DBProxyArn": "arn:aws:rds:us-east-1:123456789012:db-proxy:prx-0123a01b12345c0ab",
                "Status": "available",
                "EngineFamily": "PostgreSQL",
                "VpcId": "vpc-1234567",
                "VpcSecurityGroupIds": [
                    "sg-1234"
                ],
                "VpcSubnetIds": [
                    "subnetgroup1", 
                    "subnetgroup2" 
                ],
                "Auth": "[
                    {
                        "Description": "proxydescription1"
                        "AuthScheme": "SECRETS",
                        "SecretArn": "arn:aws:secretsmanager:us-west-2:123456789123:secret:secretName-1234f",
                        "IAMAuth": "DISABLED"
                    }
                ]",
                "RoleArn": "arn:aws:iam::12345678912??:role/ProxyPostgreSQLRole",
                "Endpoint": "proxyExample1.proxy-ab0cd1efghij.us-east-1.rds.amazonaws.com",
                "RequireTLS": false,
                "IdleClientTimeout": 1800,
                "DebuggingLogging": false,
                "CreatedDate": "2023-04-05T16:09:33.452000+00:00",
                "UpdatedDate": "2023-04-13T01:49:38.568000+00:00"
            },
            {
                "DBProxyName": "proxyExample2",
                "DBProxyArn": "arn:aws:rds:us-east-1:123456789012:db-proxy:prx-1234a12b23456c1ab",
                "Status": "available",
                "EngineFamily": "PostgreSQL",
                "VpcId": "sg-1234567",
                "VpcSecurityGroupIds": [
                    "sg-1234"
                ],
                "VpcSubnetIds": [
                    "subnetgroup1", 
                    "subnetgroup2" 
                ],
                "Auth": "[
                    {
                        "Description": "proxydescription2"
                        "AuthScheme": "SECRETS",
                        "SecretArn": "aarn:aws:secretsmanager:us-west-2:123456789123:secret:secretName-1234f",
                        "IAMAuth": "DISABLED"
                    }
                ]",
                "RoleArn": "arn:aws:iam::12345678912:role/ProxyPostgreSQLRole",
                "Endpoint": "proxyExample2.proxy-ab0cd1efghij.us-east-1.rds.amazonaws.com",
                "RequireTLS": false,
                "IdleClientTimeout": 1800,
                "DebuggingLogging": false,
                "CreatedDate": "2022-01-05T16:19:33.452000+00:00",
                "UpdatedDate": "2023-04-13T01:49:38.568000+00:00"
            }
        ]
    }

For more information, see `Viewing an RDS Proxy <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-setup.html#rds-proxy-viewing>`__ in the *Amazon RDS User Guide* and `Viewing an RDS Proxy <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/rds-proxy-setup.html#rds-proxy-viewing>`__ in the *Amazon Aurora User Guide*.