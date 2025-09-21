**To execute a batch SQL statement**

The following ``batch-execute-statement`` example executes a batch SQL statement over an array of data with a parameter set. ::

    aws rds-data batch-execute-statement \
        --resource-arn "arn:aws:rds:us-west-2:123456789012:cluster:mydbcluster" \
        --database "mydb" \
        --secret-arn "arn:aws:secretsmanager:us-west-2:123456789012:secret:mysecret" \
        --sql "insert into mytable values (:id, :val)" \
        --parameter-sets "[[{\"name\": \"id\", \"value\": {\"longValue\": 1}},{\"name\": \"val\", \"value\": {\"stringValue\": \"ValueOne\"}}],
            [{\"name\": \"id\", \"value\": {\"longValue\": 2}},{\"name\": \"val\", \"value\": {\"stringValue\": \"ValueTwo\"}}],
            [{\"name\": \"id\", \"value\": {\"longValue\": 3}},{\"name\": \"val\", \"value\": {\"stringValue\": \"ValueThree\"}}]]"

This command produces no output.

For more information, see `Using the Data API for Aurora Serverless <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.html>`__ in the *Amazon RDS User Guide*.
