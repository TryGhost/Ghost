**To update a resource associated to a Profile**

The following ``update-profile-resource-association`` updates a priority of a DNS Firewall rule group that is associated to the Profile. ::

    aws route53profiles update-profile-resource-association \
        --profile-resource-association-id rpr-001913120a7example \
        --resource-properties "{\"priority\": 105}"

Output::

    {
        "ProfileResourceAssociation": {
            "CreationTime": 1710851216.613,
            "Id": "rpr-001913120a7example",
            "ModificationTime": 1710852303.798,
            "Name": "test-resource-association",
            "OwnerId": "123456789012",
            "ProfileId": "rp-4987774726example",
            "ResourceArn": "arn:aws:route53resolver:us-east-1:123456789012:firewall-rule-group/rslvr-frg-cfe7f72example",
            "ResourceProperties": "{\"priority\":105}",
            "ResourceType": "FIREWALL_RULE_GROUP",
            "Status": "UPDATING",
            "StatusMessage": "Updating the Profile to DNS Firewall rule group association"
        }
    }