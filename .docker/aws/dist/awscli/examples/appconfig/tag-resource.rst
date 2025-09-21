**To tag an application**

The following ``tag-resource`` example tags an application resource. ::

    aws appconfig tag-resource \
        --resource-arn arn:aws:appconfig:us-east-1:682428703967:application/339ohji \
        --tags '{"group1" : "1"}'

This command produces no output.

For more information, see `Step 1: Creating an AWS AppConfig application <https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-creating-application.html>`__ in the *AWS AppConfig User Guide*.