**To describe DB proxy targets**

The following ``describe-db-proxy-targets`` example returns information about DB proxy targets. ::

    aws rds describe-db-proxy-targets \
        --db-proxy-name proxyExample

Output::

    {
        "Targets": [
            {
                "Endpoint": "database1.ab0cd1efghij.us-east-1.rds.amazonaws.com",
                "TrackedClusterId": "database1",
                "RdsResourceId": "database1-instance-1",
                "Port": 3306,
                "Type": "RDS_INSTANCE",
                "Role": "READ_WRITE",
                "TargetHealth": {
                    "State": "UNAVAILABLE",
                    "Reason": "PENDING_PROXY_CAPACITY",
                    "Description": "DBProxy Target is waiting for proxy to scale to desired capacity"
                }
            }
        ]
    }

For more information, see `Viewing an RDS proxy <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-setup.html#rds-proxy-viewing>`__ in the *Amazon RDS User Guide* and `Viewing an RDS proxy <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/rds-proxy-setup.html#rds-proxy-viewing>`__ in the *Amazon Aurora User Guide*.