**To list provisioning templates**

The following ``list-provisioning-templates`` example lists all of the provisioning templates in your AWS account. :: 

    aws iot list-provisioning-templates

Output::

    {
        "templates": [
            {
                "templateArn": "arn:aws:iot:us-east-1:123456789012:provisioningtemplate/widget-template",
                "templateName": "widget-template",
                "description": "A provisioning template for widgets",
                "creationDate": 1574800471.367,
                "lastModifiedDate": 1574801192.324,
                "enabled": false
            }
        ]
    }

For more information, see `AWS IoT Secure Tunneling <https://docs.aws.amazon.com/iot/latest/developerguide/secure-tunneling.html>`__ in the *AWS IoT Core Developer Guide*.
