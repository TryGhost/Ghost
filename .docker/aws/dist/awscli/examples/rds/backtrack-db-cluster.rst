**To backtrack an Aurora DB cluster**

The following ``backtrack-db-cluster`` example backtracks the specified DB cluster sample-cluster to March 19, 2018, at 10 a.m. :: 

    aws rds backtrack-db-cluster --db-cluster-identifier sample-cluster --backtrack-to 2018-03-19T10:00:00+00:00

This command outputs a JSON block that acknowledges the change to the RDS resource.
