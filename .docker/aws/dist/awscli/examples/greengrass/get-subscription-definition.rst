**To retrieve information about a subscription definition**

The following ``get-subscription-definition`` example retrieves information about the specified subscription definition. To retrieve the IDs of your subscription definitions, use the ``list-subscription-definitions`` command. ::

    aws greengrass get-subscription-definition \
        --subscription-definition-id "70e49321-83d5-45d2-bc09-81f4917ae152"
    
Output::

    {
        "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/subscriptions/70e49321-83d5-45d2-bc09-81f4917ae152",
        "CreationTimestamp": "2019-06-18T17:03:52.392Z",
        "Id": "70e49321-83d5-45d2-bc09-81f4917ae152",
        "LastUpdatedTimestamp": "2019-06-18T17:03:52.392Z",
        "LatestVersion": "88ae8699-12ac-4663-ba3f-4d7f0519140b",
        "LatestVersionArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/subscriptions/70e49321-83d5-45d2-bc09-81f4917ae152/versions/88ae8699-12ac-4663-ba3f-4d7f0519140b",
        "tags": {}
    }
