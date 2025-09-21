**Example 1: To describe DB cluster endpoints**

The following ``describe-db-cluster-endpoints`` example retrieves details for your DB cluster endpoints. The most common kinds of Aurora clusters have two endpoints. One endpoint has type ``WRITER``. You can use this endpoint for all SQL statements. The other endpoint has type ``READER``. You can use this endpoint only for SELECT and other read-only SQL statements. ::

    aws rds describe-db-cluster-endpoints

Output::

    {
        "DBClusterEndpoints": [
            {
                "DBClusterIdentifier": "my-database-1",
                "Endpoint": "my-database-1.cluster-cnpexample.us-east-1.rds.amazonaws.com",
                "Status": "creating",
                "EndpointType": "WRITER"
            },
            {
                "DBClusterIdentifier": "my-database-1",
                "Endpoint": "my-database-1.cluster-ro-cnpexample.us-east-1.rds.amazonaws.com",
                "Status": "creating",
                "EndpointType": "READER"
            },
            {
                "DBClusterIdentifier": "mydbcluster",
                "Endpoint": "mydbcluster.cluster-cnpexamle.us-east-1.rds.amazonaws.com",
                "Status": "available",
                "EndpointType": "WRITER"
            },
            {
                "DBClusterIdentifier": "mydbcluster",
                "Endpoint": "mydbcluster.cluster-ro-cnpexample.us-east-1.rds.amazonaws.com",
                "Status": "available",
                "EndpointType": "READER"
            }
        ]
    }

**Example 2: To describe DB cluster endpoints of a single DB cluster**

The following ``describe-db-cluster-endpoints`` example retrieves details for the DB cluster endpoints of a single specified DB cluster. Aurora Serverless clusters have only a single endpoint with a type of ``WRITER``. ::

    aws rds describe-db-cluster-endpoints \
        --db-cluster-identifier serverless-cluster

Output::

    {
        "DBClusterEndpoints": [
            {
                "Status": "available",
                "Endpoint": "serverless-cluster.cluster-cnpexample.us-east-1.rds.amazonaws.com",
                "DBClusterIdentifier": "serverless-cluster",
                "EndpointType": "WRITER"
            }
        ]
    }

For more information, see `Amazon Aurora Connection Management <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Overview.Endpoints.html>`__ in the *Amazon Aurora User Guide*.
