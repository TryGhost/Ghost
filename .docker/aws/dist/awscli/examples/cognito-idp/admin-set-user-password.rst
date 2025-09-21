**To set a user password as an admin**

The following ``admin-set-user-password`` example permanently sets the password for diego@example.com. ::

    aws cognito-idp admin-set-user-password \
        --user-pool-id us-west-2_EXAMPLE \
        --username diego@example.com \
        --password MyExamplePassword1! \
        --permanent

This command produces no output.

For more information, see `Passwords, password recovery, and password policies <https://docs.aws.amazon.com/cognito/latest/developerguide/managing-users-passwords.html>`__ in the *Amazon Cognito Developer Guide*.
