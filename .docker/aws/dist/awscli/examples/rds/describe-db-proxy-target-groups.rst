**To describe a DB proxy endpoints**

The following ``describe-db-proxy-target-groups`` example returns information about DB proxy target groups. ::

    aws rds describe-db-proxy-target-groups \
        --db-proxy-name proxyExample

Output::

    {
    "TargetGroups": 
        {
            "DBProxyName": "proxyExample",
            "TargetGroupName": "default",
            "TargetGroupArn": "arn:aws:rds:us-east-1:123456789012:target-group:prx-tg-0123a01b12345c0ab",
            "IsDefault": true,
            "Status": "available",
            "ConnectionPoolConfig": {
                "MaxConnectionsPercent": 100,
                "MaxIdleConnectionsPercent": 50,
                "ConnectionBorrowTimeout": 120,
                "SessionPinningFilters": []
            },
            "CreatedDate": "2023-05-02T18:41:19.495000+00:00",
            "UpdatedDate": "2023-05-02T18:41:21.762000+00:00"
        }
    }

For more information, see `Viewing an RDS Proxy <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-setup.html#rds-proxy-viewing>`__ in the *Amazon RDS User Guide* and `Viewing an RDS Proxy <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/rds-proxy-setup.html#rds-proxy-viewing>`__ in the *Amazon Aurora User Guide*.