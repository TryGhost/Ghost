**To list the tags of an application**

The following ``list-tags-for-resource`` example lists the tags of a specified application. ::

    aws appconfig list-tags-for-resource \
        --resource-arn arn:aws:appconfig:us-east-1:682428703967:application/339ohji

Output::

    {
        "Tags": {
            "group1": "1"
        }
    }

For more information, see `Step 1: Creating an AWS AppConfig application <https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-creating-application.html>`__ in the *AWS AppConfig User Guide*.