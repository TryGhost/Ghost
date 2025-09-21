**To roll back a SQL transaction**

The following ``rollback-transaction`` example rolls back the specified SQL transaction. ::

    aws rds-data rollback-transaction \
        --resource-arn "arn:aws:rds:us-west-2:123456789012:cluster:mydbcluster" \
        --secret-arn "arn:aws:secretsmanager:us-west-2:123456789012:secret:mysecret" \
        --transaction-id "ABC1234567890xyz"

Output::

    {
        "transactionStatus": "Rollback Complete"
    }

For more information, see `Using the Data API for Aurora Serverless <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.html>`__ in the *Amazon RDS User Guide*.
