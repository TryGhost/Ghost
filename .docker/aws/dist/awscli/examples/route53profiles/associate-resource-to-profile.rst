**To associate a resource to a Profile**

The following ``associate-resource-to-profile`` example associates a DNS Firewall rule group with the priority of 102 to a Profile. ::

    aws route53profiles associate-resource-to-profile \
        --name test-resource-association \
        --profile-id rp-4987774726example \
        --resource-arn arn:aws:route53resolver:us-east-1:123456789012:firewall-rule-group/rslvr-frg-cfe7f72example \
        --resource-properties "{\"priority\": 102}"

Output::

    {
        "ProfileResourceAssociation": {
            "CreationTime": 1710851216.613,
            "Id": "rpr-001913120a7example",
            "ModificationTime": 1710851216.613,
            "Name": "test-resource-association",
            "OwnerId": "123456789012",
            "ProfileId": "rp-4987774726example",
            "ResourceArn": "arn:aws:route53resolver:us-east-1:123456789012:firewall-rule-group/rslvr-frg-cfe7f72example",
            "ResourceProperties": "{\"priority\":102}",
            "ResourceType": "FIREWALL_RULE_GROUP",
            "Status": "UPDATING",
            "StatusMessage": "Updating the Profile to DNS Firewall rule group association"
        }
    }

