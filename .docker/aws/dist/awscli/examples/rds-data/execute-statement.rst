**Example 1: To execute a SQL statement that is part of a transaction**

The following ``execute-statement`` example runs a SQL statement that is part of a transaction. ::

    aws rds-data execute-statement \
        --resource-arn "arn:aws:rds:us-west-2:123456789012:cluster:mydbcluster" \
        --database "mydb" \
        --secret-arn "arn:aws:secretsmanager:us-west-2:123456789012:secret:mysecret" \
        --sql "update mytable set quantity=5 where id=201" \
        --transaction-id "ABC1234567890xyz"

Output::

    {
        "numberOfRecordsUpdated": 1
    }

**Example 2: To execute a SQL statement with parameters**

The following ``execute-statement`` example runs a SQL statement with parameters. ::

    aws rds-data execute-statement \
        --resource-arn "arn:aws:rds:us-east-1:123456789012:cluster:mydbcluster" \
        --database "mydb" \
        --secret-arn "arn:aws:secretsmanager:us-east-1:123456789012:secret:mysecret" \
        --sql "insert into mytable values (:id, :val)" \
        --parameters "[{\"name\": \"id\", \"value\": {\"longValue\": 1}},{\"name\": \"val\", \"value\": {\"stringValue\": \"value1\"}}]"

Output::

    {
        "numberOfRecordsUpdated": 1
    }

For more information, see `Using the Data API for Aurora Serverless <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.html>`__ in the *Amazon RDS User Guide*.

