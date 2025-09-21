**To set or change the current account password policy**

The following ``update-account-password-policy`` command sets the password policy to require a minimum length of eight
characters and to require one or more numbers in the password. ::

    aws iam update-account-password-policy \
        --minimum-password-length 8 \
        --require-numbers

This command produces no output.

Changes to an account's password policy affect any new passwords that are created for IAM users in the account. Password
policy changes do not affect existing passwords.

For more information, see `Setting an account password policy for IAM users <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_passwords_account-policy.html>`__ in the *AWS IAM User Guide*.