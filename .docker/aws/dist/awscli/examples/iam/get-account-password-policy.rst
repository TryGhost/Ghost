**To see the current account password policy**

The following ``get-account-password-policy`` command displays details about the password policy for the current account. ::

    aws iam get-account-password-policy

Output::

    {
        "PasswordPolicy": {
            "AllowUsersToChangePassword": false,
            "RequireLowercaseCharacters": false,
            "RequireUppercaseCharacters": false,
            "MinimumPasswordLength": 8,
            "RequireNumbers": true,
            "RequireSymbols": true
        }
    }

If no password policy is defined for the account, the command returns a ``NoSuchEntity`` error.

For more information, see `Setting an account password policy for IAM users <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_passwords_account-policy.html>`__ in the *AWS IAM User Guide*.