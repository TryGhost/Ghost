**To describe attributes of an AWS account**

The following ``describe-account-attributes`` example displays the attributes attached to the calling AWS account. ::

    aws redshift describe-account-attributes

Output::

    {
        "AccountAttributes": [
            {
                "AttributeName": "max-defer-maintenance-duration",
                "AttributeValues": [
                    {
                        "AttributeValue": "45"
                    }
                ]
            }
        ]
    }
