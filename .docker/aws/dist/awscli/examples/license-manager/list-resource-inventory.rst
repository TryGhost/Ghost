**To list resources in the resource inventory**

The following ``list-resource-inventory`` example lists the resources managed using Systems Manager inventory. ::

    aws license-manager list-resource-inventory 

Output::

    {
        "ResourceInventoryList": [
            {
                "Platform": "Red Hat Enterprise Linux Server",
                "ResourceType": "EC2Instance",
                "PlatformVersion": "7.4",
                "ResourceArn": "arn:aws:ec2:us-west-2:1234567890129:instance/i-05d3cdfb05bd36376",
                "ResourceId": "i-05d3cdfb05bd36376",
                "ResourceOwningAccountId": "1234567890129"
            },
            {
                "Platform": "Amazon Linux",
                "ResourceType": "EC2Instance",
                "PlatformVersion": "2",
                "ResourceArn": "arn:aws:ec2:us-west-2:1234567890129:instance/i-0b1d036cfd4594808",
                "ResourceId": "i-0b1d036cfd4594808",
                "ResourceOwningAccountId": "1234567890129"
            },
            {
                "Platform": "Microsoft Windows Server 2019 Datacenter",
                "ResourceType": "EC2Instance",
                "PlatformVersion": "10.0.17763",
                "ResourceArn": "arn:aws:ec2:us-west-2:1234567890129:instance/i-0cdb3b54a2a8246ad",
                "ResourceId": "i-0cdb3b54a2a8246ad",
                "ResourceOwningAccountId": "1234567890129"
            }
        ]
    }
