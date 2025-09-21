**To describe DB cluster parameter groups**

The following ``describe-db-cluster-parameter-groups`` example retrieves details for your DB cluster parameter groups. ::

    aws rds describe-db-cluster-parameter-groups

Output::

   {
       "DBClusterParameterGroups": [
           {
               "DBClusterParameterGroupName": "default.aurora-mysql5.7",
               "DBParameterGroupFamily": "aurora-mysql5.7",
               "Description": "Default cluster parameter group for aurora-mysql5.7",
               "DBClusterParameterGroupArn": "arn:aws:rds:us-east-1:123456789012:cluster-pg:default.aurora-mysql5.7"
           },
           {
               "DBClusterParameterGroupName": "default.aurora-postgresql9.6",
               "DBParameterGroupFamily": "aurora-postgresql9.6",
               "Description": "Default cluster parameter group for aurora-postgresql9.6",
               "DBClusterParameterGroupArn": "arn:aws:rds:us-east-1:123456789012:cluster-pg:default.aurora-postgresql9.6"
           },
           {
               "DBClusterParameterGroupName": "default.aurora5.6",
               "DBParameterGroupFamily": "aurora5.6",
               "Description": "Default cluster parameter group for aurora5.6",
               "DBClusterParameterGroupArn": "arn:aws:rds:us-east-1:123456789012:cluster-pg:default.aurora5.6"
           },
           {
               "DBClusterParameterGroupName": "mydbclusterpg",
               "DBParameterGroupFamily": "aurora-mysql5.7",
               "Description": "My DB cluster parameter group",
               "DBClusterParameterGroupArn": "arn:aws:rds:us-east-1:123456789012:cluster-pg:mydbclusterpg"
           },
           {
               "DBClusterParameterGroupName": "mydbclusterpgcopy",
               "DBParameterGroupFamily": "aurora-mysql5.7",
               "Description": "Copy of mydbclusterpg parameter group",
               "DBClusterParameterGroupArn": "arn:aws:rds:us-east-1:123456789012:cluster-pg:mydbclusterpgcopy"
           }
       ]
   }

For more information, see `Working with DB Parameter Groups and DB Cluster Parameter Groups <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_WorkingWithParamGroups.html>`__ in the *Amazon Aurora User Guide*.
