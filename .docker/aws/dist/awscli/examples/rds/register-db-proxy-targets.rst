**To register a DB proxy with a database**

The following ``register-db-proxy-targets`` example creates the association between a database and a proxy. :: 

    aws rds register-db-proxy-targets \
        --db-proxy-name proxyExample \
        --db-cluster-identifiers database-5

Output::

    {
        "DBProxyTargets": [
            {
                "RdsResourceId": "database-5",
                "Port": 3306,
                "Type": "TRACKED_CLUSTER",
                "TargetHealth": {
                    "State": "REGISTERING"
                }
            },
            {
                "Endpoint": "database-5instance-1.ab0cd1efghij.us-east-1.rds.amazonaws.com",
                "RdsResourceId": "database-5",
                "Port": 3306,
                "Type": "RDS_INSTANCE",
                "TargetHealth": {
                    "State": "REGISTERING"
                }
            }
        ]
    }

For more information, see `Creating an RDS proxy <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-setup.html#rds-proxy-creating>`__ in the *Amazon RDS User Guide* and `Creating an RDS proxy <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/rds-proxy-setup.html#rds-proxy-creating>`__ in the *Amazon Aurora User Guide*.