**To list the billing groups for your AWS account and region**

The following ``list-billing-groups`` example lists all billing groups that are defined for your AWS account and AWS Region. ::

    aws iot list-billing-groups

Output::

    {
        "billingGroups": [
            {
                "groupName": "GroupOne",
                "groupArn": "arn:aws:iot:us-west-2:123456789012:billinggroup/GroupOne"
            }
        ]
    }

For more information, see `Billing Groups <https://docs.aws.amazon.com/iot/latest/developerguide/tagging-iot-billing-groups.html>`__ in the *AWS IoT Developers Guide*.
