**To sign out a user as an admin**

The following ``admin-user-global-sign-out`` example signs out the user diego@example.com. ::

    aws cognito-idp admin-user-global-sign-out \
        --user-pool-id us-west-2_EXAMPLE \
        --username diego@example.com

For more information, see `Authentication with a user pool <https://docs.aws.amazon.com/cognito/latest/developerguide/authentication.html>`__ in the *Amazon Cognito Developer Guide*.
