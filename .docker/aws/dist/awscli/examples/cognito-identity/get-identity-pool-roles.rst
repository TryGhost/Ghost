**To get identity pool roles**

This example gets identity pool roles.

Command::

  aws cognito-identity get-identity-pool-roles --identity-pool-id "us-west-2:11111111-1111-1111-1111-111111111111" 

Output::

  {
    "IdentityPoolId": "us-west-2:11111111-1111-1111-1111-111111111111",
    "Roles": {
        "authenticated": "arn:aws:iam::111111111111:role/Cognito_MyIdentityPoolAuth_Role",
        "unauthenticated": "arn:aws:iam::111111111111:role/Cognito_MyIdentityPoolUnauth_Role"
    }
  }