**To disassociate a resource from Profile**

The following ``disassociate-resource-from-profile`` example disassociates a DNS Firewall rule group from a Profile. ::

    aws route53profiles disassociate-resource-from-profile \
        --profile-id rp-4987774726example \
        --resource-arn arn:aws:route53resolver:us-east-1:123456789012:firewall-rule-group/rslvr-frg-cfe7f72example

Output::

    {
        "ProfileResourceAssociation": {
            "CreationTime": 1710851216.613,
            "Id": "rpr-001913120a7example",
            "ModificationTime": 1710852624.36,
            "Name": "test-resource-association",
            "OwnerId": "123456789012",
            "ProfileId": "rp-4987774726example",
            "ResourceArn": "arn:aws:route53resolver:us-east-1:123456789012:firewall-rule-group/rslvr-frg-cfe7f72example",
            "ResourceProperties": "{\"priority\":105}",
            "ResourceType": "FIREWALL_RULE_GROUP",
            "Status": "DELETING",
            "StatusMessage": "Deleting the Profile to DNS Firewall rule group association"
        }
    }