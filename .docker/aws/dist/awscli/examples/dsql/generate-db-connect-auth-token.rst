**To generate an IAM authentication token**

The following ``generate-db-connect-auth-token`` example generates IAM authentication token to connect to a database. ::

    aws dsql generate-db-connect-auth-token \
        --hostname abc0def1baz2quux3quuux4.dsql.us-east-1.on.aws \
        --region us-east-1 \
        --expires-in 3600

Output::

    'abc0def1baz2quux3quuux4.dsql.us-east-1.on.aws/?Action=DbConnect&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=access_key%2F20241107%2Fus-east-1%2Fdsql%2Faws4_request&X-Amz-Date=20241107T173933Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=b53dae15763139d6a5af5e318b117ff6e66c5ee859b14d44697d159cbe996077'

