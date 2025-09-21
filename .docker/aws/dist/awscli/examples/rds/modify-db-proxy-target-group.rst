**To modify a DB proxy endpoints**

The following ``modify-db-proxy-target-group`` example modifies a DB proxy target group to set the maximum connections to 80 percent and maximum idle connections to 10 percent. ::

    aws rds modify-db-proxy-target-group \
        --target-group-name default \
        --db-proxy-name proxyExample \
        --connection-pool-config MaxConnectionsPercent=80,MaxIdleConnectionsPercent=10


Output::

    {
    "DBProxyTargetGroup": 
        {
            "DBProxyName": "proxyExample",
            "TargetGroupName": "default",
            "TargetGroupArn": "arn:aws:rds:us-east-1:123456789012:target-group:prx-tg-0123a01b12345c0ab",
            "IsDefault": true,
            "Status": "available",
            "ConnectionPoolConfig": {
                "MaxConnectionsPercent": 80,
                "MaxIdleConnectionsPercent": 10,
                "ConnectionBorrowTimeout": 120,
                "SessionPinningFilters": []
            },
            "CreatedDate": "2023-05-02T18:41:19.495000+00:00",
            "UpdatedDate": "2023-05-02T18:41:21.762000+00:00"
        }
    }

For more information, see `Modifying an RDS Proxy <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-managing.html#rds-proxy-modifying-proxy>`__ in the *Amazon RDS User Guide* and `Modifying an RDS Proxy <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/rds-proxy-managing.html#rds-proxy-modifying-proxy>`__ in the *Amazon Aurora User Guide*.


