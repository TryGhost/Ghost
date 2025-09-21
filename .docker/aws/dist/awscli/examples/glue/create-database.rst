**To create a database**

The following ``create-database`` example creates a database in the AWS Glue Data Catalog. ::

    aws glue create-database \
        --database-input "{\"Name\":\"tempdb\"}" \
        --profile my_profile \
        --endpoint https://glue.us-east-1.amazonaws.com

This command produces no output.

For more information, see `Defining a Database in Your Data Catalog <https://docs.aws.amazon.com/glue/latest/dg/define-database.html>`__ in the *AWS Glue Developer Guide*.
