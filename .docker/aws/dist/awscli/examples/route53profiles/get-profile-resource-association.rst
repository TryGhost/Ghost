**To get information about a resource associated to a Profile**

The following ``get-profile-resource-association`` returns information about the specified resource association to a Profile. ::

    aws route53profiles get-profile-resource-association \
        --profile-resource-association-id rpr-001913120a7example

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
            "Status": "COMPLETE",
            "StatusMessage": "Completed creation of Profile to DNS Firewall rule group association"
        }
    }