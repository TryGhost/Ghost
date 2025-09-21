**To generate an authentication token**

The following ``generate-db-auth-token`` example generates an authentication token for use with IAM database authentication. ::

    aws rds generate-db-auth-token \
        --hostname aurmysql-test.cdgmuqiadpid.us-west-2.rds.amazonaws.com \
        --port 3306 \
        --region us-east-1 \
        --username jane_doe

Output::

    aurmysql-test.cdgmuqiadpid.us-west-2.rds.amazonaws.com:3306/?Action=connect&DBUser=jane_doe&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIESZCNJ3OEXAMPLE%2F20180731%2Fus-east-1%2Frds-db%2Faws4_request&X-Amz-Date=20180731T235209Z&X-Amz-Expires=900&X-Amz-SignedHeaders=host&X-Amz-Signature=5a8753ebEXAMPLEa2c724e5667797EXAMPLE9d6ec6e3f427191fa41aeEXAMPLE
