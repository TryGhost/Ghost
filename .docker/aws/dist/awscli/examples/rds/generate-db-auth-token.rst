**To generate an IAM authentication token**

The following ``generate-db-auth-token`` example generates IAM authentication token to connect to a database. ::

    aws rds generate-db-auth-token \
        --hostname mydb.123456789012.us-east-1.rds.amazonaws.com \
        --port 3306 \
        --region us-east-1 \
        --username db_user

Output::

    mydb.123456789012.us-east-1.rds.amazonaws.com:3306/?Action=connect&DBUser=db_user&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIEXAMPLE%2Fus-east-1%2Frds-db%2Faws4_request&X-Amz-Date=20210123T011543Z&X-Amz-Expires=900&X-Amz-SignedHeaders=host&X-Amz-Signature=88987EXAMPLE1EXAMPLE2EXAMPLE3EXAMPLE4EXAMPLE5EXAMPLE6

For more information, see `Connecting to your DB instance using IAM authentication <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.Connecting.html>`__ in the *Amazon RDS User Guide* and `Connecting to your DB cluster using IAM authentication <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/UsingWithRDS.IAMDBAuth.Connecting.html>`__ in the *Amazon Aurora User Guide*.