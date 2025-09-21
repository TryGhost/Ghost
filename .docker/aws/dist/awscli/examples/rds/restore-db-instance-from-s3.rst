**To restore a DB instance from a backup in Amazon S3**

The following ``restore-db-instance-from-s3`` example creates a new DB instance named ``restored-test-instance`` from an existing backup in the ``my-backups`` S3 bucket. ::

    aws rds restore-db-instance-from-s3 \
        --db-instance-identifier restored-test-instance \
        --allocated-storage 250 --db-instance-class db.m4.large --engine mysql \
        --master-username master --master-user-password secret99 \
        --s3-bucket-name my-backups --s3-ingestion-role-arn arn:aws:iam::123456789012:role/my-role \
        --source-engine mysql --source-engine-version 5.6.27
