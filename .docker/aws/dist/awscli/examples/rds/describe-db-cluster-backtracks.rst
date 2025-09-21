**To describe backtracks for a DB cluster**

The following ``describe-db-cluster-backtracks`` example retrieves details about the specified DB cluster. ::

    aws rds describe-db-cluster-backtracks \
        --db-cluster-identifier mydbcluster

Output::

    {
        "DBClusterBacktracks": [
            {
                "DBClusterIdentifier": "mydbcluster",
                "BacktrackIdentifier": "2f5f5294-0dd2-44c9-9f50-EXAMPLE",
                "BacktrackTo": "2021-02-12T04:59:22Z",
                "BacktrackedFrom": "2021-02-12T14:37:31.640Z",
                "BacktrackRequestCreationTime": "2021-02-12T14:36:18.819Z",
                "Status": "COMPLETED"
            },
            {
                "DBClusterIdentifier": "mydbcluster",
                "BacktrackIdentifier": "3c7a6421-af2a-4ea3-ae95-EXAMPLE",
                "BacktrackTo": "2021-02-11T22:53:46Z",
                "BacktrackedFrom": "2021-02-12T00:09:27.006Z",
                "BacktrackRequestCreationTime": "2021-02-12T00:07:53.487Z",
                "Status": "COMPLETED"
            }
        ]
    }

For more information, see `Backtracking an Aurora DB cluster <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Managing.Backtrack.html>`__ in the *Amazon Aurora User Guide*.