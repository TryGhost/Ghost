**To prevent sign-in by a user**

The following ``admin-disable-user`` example prevents sign-in by the user ``diego@example.com``. ::

    aws cognito-idp admin-disable-user \
        --user-pool-id us-west-2_EXAMPLE \
        --username diego@example.com

For more information, see `Managing users <https://docs.aws.amazon.com/cognito/latest/developerguide/managing-users.html>`__ in the *Amazon Cognito Developer Guide*.
