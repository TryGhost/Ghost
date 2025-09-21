**To disassociate an AWS Identity and Access Management (IAM) role from a DB cluster**

The following ``remove-role-from-db-cluster`` example removes a role from a DB cluster. ::

    aws rds remove-role-from-db-cluster \
        --db-cluster-identifier mydbcluster \
        --role-arn arn:aws:iam::123456789012:role/RDSLoadFromS3

This command produces no output.

For more information, see `Associating an IAM role with an Amazon Aurora MySQL DB cluster <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Integrating.Authorizing.IAM.AddRoleToDBCluster.html>`__ in the *Amazon Aurora User Guide*.