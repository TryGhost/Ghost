**To set identity pool roles**

The following ``set-identity-pool-roles``  example sets an identity pool role. ::

    aws cognito-identity set-identity-pool-roles \
        --identity-pool-id "us-west-2:11111111-1111-1111-1111-111111111111" \
        --roles authenticated="arn:aws:iam::111111111111:role/Cognito_MyIdentityPoolAuth_Role"
