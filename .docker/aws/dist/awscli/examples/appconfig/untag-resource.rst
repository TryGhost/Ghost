**To remove a tag from an application**

The following ``untag-resource`` example removes the group1 tag from the specified application. ::

    aws appconfig untag-resource \
        --resource-arn arn:aws:appconfig:us-east-1:111122223333:application/339ohji \
        --tag-keys '["group1"]'

This command produces no output.

For more information, see `Step 1: Creating an AWS AppConfig application <https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-creating-application.html>`__ in the *AWS AppConfig User Guide*.