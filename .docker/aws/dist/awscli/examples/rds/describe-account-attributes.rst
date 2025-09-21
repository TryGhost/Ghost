**To describe account attributes**

The following ``describe-account-attributes`` example retrieves the attributes for the current AWS account. ::

    aws rds describe-account-attributes

Output::

    {
        "AccountQuotas": [
            {
                "Max": 40,
                "Used": 4,
                "AccountQuotaName": "DBInstances"
            },
            {
                "Max": 40,
                "Used": 0,
                "AccountQuotaName": "ReservedDBInstances"
            },
            {
                "Max": 100000,
                "Used": 40,
                "AccountQuotaName": "AllocatedStorage"
            },
            {
                "Max": 25,
                "Used": 0,
                "AccountQuotaName": "DBSecurityGroups"
            },
            {
                "Max": 20,
                "Used": 0,
                "AccountQuotaName": "AuthorizationsPerDBSecurityGroup"
            },
            {
                "Max": 50,
                "Used": 1,
                "AccountQuotaName": "DBParameterGroups"
            },
            {
                "Max": 100,
                "Used": 3,
                "AccountQuotaName": "ManualSnapshots"
            },
            {
                "Max": 20,
                "Used": 0,
                "AccountQuotaName": "EventSubscriptions"
            },
            {
                "Max": 50,
                "Used": 1,
                "AccountQuotaName": "DBSubnetGroups"
            },
            {
                "Max": 20,
                "Used": 1,
                "AccountQuotaName": "OptionGroups"
            },
            {
                "Max": 20,
                "Used": 6,
                "AccountQuotaName": "SubnetsPerDBSubnetGroup"
            },
            {
                "Max": 5,
                "Used": 0,
                "AccountQuotaName": "ReadReplicasPerMaster"
            },
            {
                "Max": 40,
                "Used": 1,
                "AccountQuotaName": "DBClusters"
            },
            {
                "Max": 50,
                "Used": 0,
                "AccountQuotaName": "DBClusterParameterGroups"
            },
            {
                "Max": 5,
                "Used": 0,
                "AccountQuotaName": "DBClusterRoles"
            }
        ]
    }
