**To create a password for an IAM user**

To create a password for an IAM user, we recommend using the ``--cli-input-json`` parameter to pass a JSON file that contains the password. Using this method, you can create a strong password with non-alphanumeric characters. It can be difficult to create a password with non-alphanumeric characters when you pass it as a command line parameter.

To use the ``--cli-input-json`` parameter, start by using the ``create-login-profile`` command with the ``--generate-cli-skeleton`` parameter, as in the following example. ::

    aws iam create-login-profile \
        --generate-cli-skeleton > create-login-profile.json

The previous command creates a JSON file called create-login-profile.json that you can use to fill in the information for a subsequent ``create-login-profile`` command. For example::

    {
        "UserName": "Bob",
        "Password": "&1-3a6u:RA0djs",
        "PasswordResetRequired": true
    }

Next, to create a password for an IAM user, use the ``create-login-profile`` command again, this time passing the ``--cli-input-json`` parameter to specify your JSON file. The following ``create-login-profile`` command uses the ``--cli-input-json`` parameter with a JSON file called create-login-profile.json. ::

    aws iam create-login-profile \
        --cli-input-json file://create-login-profile.json

Output::

    {
        "LoginProfile": {
            "UserName": "Bob",
            "CreateDate": "2015-03-10T20:55:40.274Z",
            "PasswordResetRequired": true
        }
    }

If the new password violates the account password policy, the command returns a ``PasswordPolicyViolation`` error.

To change the password for a user that already has one, use ``update-login-profile``. To set a password policy for the account, use the ``update-account-password-policy`` command. 

If the account password policy allows them to, IAM users can change their own passwords using the ``change-password`` command.

For more information, see `Managing passwords for IAM users <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_passwords_admin-change-user.html>`__ in the *AWS IAM User Guide*.