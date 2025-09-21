**To scale the capacity of an Aurora Serverless DB cluster**

The following ``modify-current-db-cluster-capacity`` example scales the capacity of an Aurora Serverless DB cluster to 8. ::

    aws rds modify-current-db-cluster-capacity \
        --db-cluster-identifier mydbcluster \
        --capacity 8

Output::

    {
        "DBClusterIdentifier": "mydbcluster",
        "PendingCapacity": 8,
        "CurrentCapacity": 1,
        "SecondsBeforeTimeout": 300,
        "TimeoutAction": "ForceApplyCapacityChange"
    }

For more information, see `Scaling Aurora Serverless v1 DB cluster capacity manually <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless.setting-capacity.html>`__ in the *Amazon Aurora User Guide*.