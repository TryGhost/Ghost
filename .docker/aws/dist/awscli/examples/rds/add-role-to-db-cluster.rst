**To associate an AWS Identity and Access Management (IAM) role with a DB cluster**

The following ``add-role-to-db-cluster`` example associates a role with a DB cluster. ::

    aws rds add-role-to-db-cluster \
        --db-cluster-identifier mydbcluster \
        --role-arn arn:aws:iam::123456789012:role/RDSLoadFromS3

This command produces no output.

For more information, see `Associating an IAM role with an Amazon Aurora MySQL DB cluster <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Integrating.Authorizing.IAM.AddRoleToDBCluster.html>`__ in the *Amazon Aurora User Guide*.