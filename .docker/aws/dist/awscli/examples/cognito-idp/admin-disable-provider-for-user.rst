**To unlink a federated user from a local user profile**

The following ``admin-disable-provider-for-user`` example disconnects a Google user from their linked local profile. ::

    aws cognito-idp admin-disable-provider-for-user \
        --user-pool-id us-west-2_EXAMPLE \
        --user ProviderAttributeName=Cognito_Subject,ProviderAttributeValue=0000000000000000,ProviderName=Google

For more information, see `Linking federated users to an existing user profile <https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-identity-federation-consolidate-users.html>`__ in the *Amazon Cognito Developer Guide*.
