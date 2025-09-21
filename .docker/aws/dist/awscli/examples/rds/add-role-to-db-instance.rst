**To associate an AWS Identity and Access Management (IAM) role with a DB instance**

The following ``add-role-to-db-instance`` example adds the role to an Oracle DB instance named ``test-instance``. ::

    aws rds add-role-to-db-instance \
        --db-instance-identifier test-instance \
        --feature-name S3_INTEGRATION \
        --role-arn arn:aws:iam::111122223333:role/rds-s3-integration-role

This command produces no output.

For more information, see `Prerequisites for Amazon RDS Oracle Integration with Amazon S3 <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/oracle-s3-integration.html#oracle-s3-integration.preparing>`__ in the *Amazon RDS User Guide*.
