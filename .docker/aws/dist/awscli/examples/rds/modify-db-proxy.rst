**To modify a DB proxy for an RDS database**

The following ``modify-db-proxy`` example modifies a DB proxy named ``proxyExample`` to require SSL for its connections. ::

    aws rds modify-db-proxy \
        --db-proxy-name proxyExample \
        --require-tls

Output::

    {
    "DBProxy":
        {
            "DBProxyName": "proxyExample",
            "DBProxyArn": "arn:aws:rds:us-east-1:123456789012:db-proxy:prx-0123a01b12345c0ab",
            "Status": "modifying"
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
                    "Description": "proxydescription1",
                    "AuthScheme": "SECRETS",
                    "SecretArn": "arn:aws:secretsmanager:us-west-2:123456789123:secret:proxysecret1-Abcd1e",
                    "IAMAuth": "DISABLED"
                }
            ]",
            "RoleArn": "arn:aws:iam::12345678912:role/ProxyPostgreSQLRole",
            "Endpoint": "proxyExample.proxy-ab0cd1efghij.us-east-1.rds.amazonaws.com",
            "RequireTLS": true,
            "IdleClientTimeout": 1800,
            "DebuggingLogging": false,
            "CreatedDate": "2023-04-05T16:09:33.452000+00:00",
            "UpdatedDate": "2023-04-13T01:49:38.568000+00:00"
        }
    }

For more information, see `Modify an RDS Proxy <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-managing.html#rds-proxy-modifying-proxy>`__ in the *Amazon RDS User Guide* and `Creating an RDS Proxy <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/rds-proxy-managing.html#rds-proxy-modifying-proxy>`__ in the *Amazon Aurora User Guide*.