**To create a DB proxy for an RDS database**

The following ``create-db-proxy`` example creates a DB proxy. ::

    aws rds create-db-proxy \
        --db-proxy-name proxyExample \
        --engine-family MYSQL \
        --auth Description="proxydescription1",AuthScheme="SECRETS",SecretArn="arn:aws:secretsmanager:us-west-2:123456789123:secret:secretName-1234f",IAMAuth="DISABLED",ClientPasswordAuthType="MYSQL_NATIVE_PASSWORD" \
        --role-arn arn:aws:iam::123456789123:role/ProxyRole \
        --vpc-subnet-ids subnetgroup1 subnetgroup2

Output::

    {
    "DBProxy": {
            "DBProxyName": "proxyExample",
            "DBProxyArn": "arn:aws:rds:us-east-1:123456789012:db-proxy:prx-0123a01b12345c0ab",
            "EngineFamily": "MYSQL",
            "VpcId": "vpc-1234567",
            "VpcSecuritytGroupIds": [
                "sg-1234", 
                "sg-5678", 
                "sg-9101"
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
            "RoleArn": "arn:aws:iam::12345678912:role/ProxyRole",
            "Endpoint": "proxyExample.proxy-ab0cd1efghij.us-east-1.rds.amazonaws.com",
            "RequireTLS": false,
            "IdleClientTimeout": 1800,
            "DebuggingLogging": false,
            "CreatedDate": "2023-04-05T16:09:33.452000+00:00",
            "UpdatedDate": "2023-04-13T01:49:38.568000+00:00"
        }
    }

For more information, see `Creating an RDS Proxy <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-setup.html#rds-proxy-creating>`__ in the *Amazon RDS User Guide* and `Creating an RDS Proxy <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/rds-proxy-setup.html#rds-proxy-creating>`__ in the *Amazon Aurora User Guide*.