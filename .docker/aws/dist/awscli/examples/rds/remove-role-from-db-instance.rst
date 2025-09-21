**To disassociate an AWS Identity and Access Management (IAM) role from a DB instance**

The following ``remove-role-from-db-instance`` example removes the role named ``rds-s3-integration-role`` from an Oracle DB instance named ``test-instance``. ::

    aws rds remove-role-from-db-instance \
        --db-instance-identifier test-instance \
        --feature-name S3_INTEGRATION \
        --role-arn arn:aws:iam::111122223333:role/rds-s3-integration-role

This command produces no output.

For more information, see `Disabling RDS SQL Server Integration with S3 <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/User.SQLServer.Options.S3-integration.html#Appendix.SQLServer.Options.S3-integration.disabling>`__ in the *Amazon RDS User Guide*.
