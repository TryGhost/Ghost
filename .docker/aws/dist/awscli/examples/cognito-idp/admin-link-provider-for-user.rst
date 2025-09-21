**To link a local user to a federated user**

The following ``admin-link-provider-for-user`` example links the local user diego to a user who will do federated sign-in with Google. ::

    aws cognito-idp admin-link-provider-for-user \
        --user-pool-id us-west-2_EXAMPLE \
        --destination-user ProviderName=Cognito,ProviderAttributeValue=diego \
        --source-user ProviderAttributeName=Cognito_Subject,ProviderAttributeValue=0000000000000000,ProviderName=Google

For more information, see `Linking federated users to an existing user profile <https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-identity-federation-consolidate-users.html>`__ in the *Amazon Cognito Developer Guide*.
