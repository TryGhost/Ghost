**To delete a user attribute**

The following ``delete-user-attributes`` example deletes the custom attribute "custom:attribute" from the currently signed-in user. ::

    aws cognito-idp delete-user-attributes \
        --access-token ACCESS_TOKEN \
        --user-attribute-names "custom:department"

This command produces no output.

For more information, see `Working with user attributes <https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html>`__ in the *Amazon Cognito Developer Guide*.
