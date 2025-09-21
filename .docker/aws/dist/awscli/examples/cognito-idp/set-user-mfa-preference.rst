**To set a user's MFA preference**

The following ``set-user-mfa-preference`` example configures the current user to use TOTP MFA and disables all other MFA factors. ::

    aws cognito-idp set-user-mfa-preference \
        --access-token eyJra456defEXAMPLE \
        --software-token-mfa-settings Enabled=true,PreferredMfa=true \
        --sms-mfa-settings Enabled=false,PreferredMfa=false \
        --email-mfa-settings Enabled=false,PreferredMfa=false

This command produces no output.

For more information, see `Adding MFA <https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-mfa.html>`__ in the *Amazon Cognito Developer Guide*.
