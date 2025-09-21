**To describe source Regions**

The following ``describe-source-regions`` example retrieves details about all source AWS Regions. It also shows that automated backups can be replicated only from US West (Oregon) to the destination AWS Region, US East (N. Virginia). ::

    aws rds describe-source-regions \
        --region us-east-1

Output::

    {
        "SourceRegions": [
            {
                "RegionName": "af-south-1",
                "Endpoint": "https://rds.af-south-1.amazonaws.com",
                "Status": "available",
                "SupportsDBInstanceAutomatedBackupsReplication": false
            },
            {
                "RegionName": "ap-east-1",
                "Endpoint": "https://rds.ap-east-1.amazonaws.com",
                "Status": "available",
                "SupportsDBInstanceAutomatedBackupsReplication": false
            },
            {
                "RegionName": "ap-northeast-1",
                "Endpoint": "https://rds.ap-northeast-1.amazonaws.com",
                "Status": "available",
                "SupportsDBInstanceAutomatedBackupsReplication": true
            },
            {
                "RegionName": "ap-northeast-2",
                "Endpoint": "https://rds.ap-northeast-2.amazonaws.com",
                "Status": "available",
                "SupportsDBInstanceAutomatedBackupsReplication": true
            },
            {
                "RegionName": "ap-northeast-3",
                "Endpoint": "https://rds.ap-northeast-3.amazonaws.com",
                "Status": "available",
                "SupportsDBInstanceAutomatedBackupsReplication": false
            },
            {
                "RegionName": "ap-south-1",
                "Endpoint": "https://rds.ap-south-1.amazonaws.com",
                "Status": "available",
                "SupportsDBInstanceAutomatedBackupsReplication": true
            },
            {
                "RegionName": "ap-southeast-1",
                "Endpoint": "https://rds.ap-southeast-1.amazonaws.com",
                "Status": "available",
                "SupportsDBInstanceAutomatedBackupsReplication": true
            },
            {
                "RegionName": "ap-southeast-2",
                "Endpoint": "https://rds.ap-southeast-2.amazonaws.com",
                "Status": "available",
                "SupportsDBInstanceAutomatedBackupsReplication": true
            },
            {
                "RegionName": "ap-southeast-3",
                "Endpoint": "https://rds.ap-southeast-3.amazonaws.com",
                "Status": "available",
                "SupportsDBInstanceAutomatedBackupsReplication": false
            },
            {
                "RegionName": "ca-central-1",
                "Endpoint": "https://rds.ca-central-1.amazonaws.com",
                "Status": "available",
                "SupportsDBInstanceAutomatedBackupsReplication": true
            },
            {
                "RegionName": "eu-north-1",
                "Endpoint": "https://rds.eu-north-1.amazonaws.com",
                "Status": "available",
                "SupportsDBInstanceAutomatedBackupsReplication": true
            },
            {
                "RegionName": "eu-south-1",
                "Endpoint": "https://rds.eu-south-1.amazonaws.com",
                "Status": "available",
                "SupportsDBInstanceAutomatedBackupsReplication": false
            },
            {
                "RegionName": "eu-west-1",
                "Endpoint": "https://rds.eu-west-1.amazonaws.com",
                "Status": "available",
                "SupportsDBInstanceAutomatedBackupsReplication": true
            },
            {
                "RegionName": "eu-west-2",
                "Endpoint": "https://rds.eu-west-2.amazonaws.com",
                "Status": "available",
                "SupportsDBInstanceAutomatedBackupsReplication": true
            },
            {
                "RegionName": "eu-west-3",
                "Endpoint": "https://rds.eu-west-3.amazonaws.com",
                "Status": "available",
                "SupportsDBInstanceAutomatedBackupsReplication": true
            },
            {
                "RegionName": "me-central-1",
                 "Endpoint": "https://rds.me-central-1.amazonaws.com",
                 "Status": "available",
                 "SupportsDBInstanceAutomatedBackupsReplication": false
            },
            {
                "RegionName": "me-south-1",
                "Endpoint": "https://rds.me-south-1.amazonaws.com",
                "Status": "available",
                "SupportsDBInstanceAutomatedBackupsReplication": false
            },
            {
                "RegionName": "sa-east-1",
                "Endpoint": "https://rds.sa-east-1.amazonaws.com",
                "Status": "available",
                "SupportsDBInstanceAutomatedBackupsReplication": true
            },
            {
                "RegionName": "us-east-2",
                "Endpoint": "https://rds.us-east-2.amazonaws.com",
                "Status": "available",
                "SupportsDBInstanceAutomatedBackupsReplication": true
            },
            {
                "RegionName": "us-west-1",
                "Endpoint": "https://rds.us-west-1.amazonaws.com",
                "Status": "available",
                "SupportsDBInstanceAutomatedBackupsReplication": true
            },
            {
                "RegionName": "us-west-2",
               "Endpoint": "https://rds.us-west-2.amazonaws.com",
                "Status": "available",
                "SupportsDBInstanceAutomatedBackupsReplication": true
            }
        ]
    }

For more information, see `Finding information about replicated backups <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReplicateBackups.html#AutomatedBackups.Replicating.Describe>`__ in the *Amazon RDS User Guide*.