**To change the password for your IAM user**

To change the password for your IAM user, we recommend using the ``--cli-input-json`` parameter to pass a JSON file that contains your old and new passwords. Using this method, you can use strong passwords with non-alphanumeric characters. It can be difficult to use passwords with non-alphanumeric characters when you pass them as command line parameters. To use the ``--cli-input-json`` parameter, start by using the ``change-password`` command with the ``--generate-cli-skeleton`` parameter, as in the following example. ::

    aws iam change-password \
        --generate-cli-skeleton > change-password.json

The previous command creates a JSON file called change-password.json that you can use to fill in your old and new passwords. For example, the file might look like the following. ::

    {
        "OldPassword": "3s0K_;xh4~8XXI",
        "NewPassword": "]35d/{pB9Fo9wJ"
    }

Next, to change your password, use the ``change-password`` command again, this time passing the ``--cli-input-json`` parameter to specify your JSON file. The following ``change-password`` command uses the ``--cli-input-json`` parameter with a JSON file called change-password.json. ::

    aws iam change-password \
        --cli-input-json file://change-password.json

This command produces no output.

This command can be called by IAM users only. If this command is called using AWS account (root) credentials, the command returns an ``InvalidUserType`` error.

For more information, see `How an IAM user changes their own password <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_passwords_user-change-own.html>`__ in the *AWS IAM User Guide*.