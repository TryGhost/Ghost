**To start a SQL transaction**

The following ``begin-transaction`` example starts a SQL transaction. ::

    aws rds-data begin-transaction \
        --resource-arn "arn:aws:rds:us-west-2:123456789012:cluster:mydbcluster" \
        --database "mydb" \
        --secret-arn "arn:aws:secretsmanager:us-west-2:123456789012:secret:mysecret"

Output::

    {
        "transactionId": "ABC1234567890xyz"
    }   

For more information, see `Using the Data API for Aurora Serverless <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.html>`__ in the *Amazon RDS User Guide*.
