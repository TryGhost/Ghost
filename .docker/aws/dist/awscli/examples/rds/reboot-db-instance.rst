**To reboot a DB instance**

The following ``reboot-db-instance`` example starts a reboot of the specified DB instance. ::

    aws rds reboot-db-instance \
        --db-instance-identifier test-mysql-instance

Output::

    {
        "DBInstance": {
            "DBInstanceIdentifier": "test-mysql-instance",
            "DBInstanceClass": "db.t3.micro",
            "Engine": "mysql",
            "DBInstanceStatus": "rebooting",
            "MasterUsername": "admin",
            "Endpoint": {
                "Address": "test-mysql-instance.############.us-west-2.rds.amazonaws.com",
                "Port": 3306,
                "HostedZoneId": "Z1PVIF0EXAMPLE"
            },
            
        ... output omitted...
        
        }
    }

For more information, see `Rebooting a DB Instance <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_RebootInstance.html>`__ in the *Amazon RDS User Guide*.
