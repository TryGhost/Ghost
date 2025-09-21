**To return information about available product integrations**

The following ``describe-products`` example returns the available product integrations one at a time. ::

    aws securityhub describe-products \
        --max-results 1

Output::

    {
        "NextToken": "U2FsdGVkX18vvPlOqb7RDrWRWVFBJI46MOIAb+nZmRJmR15NoRi2gm13sdQEn3O/pq/78dGs+bKpgA+7HMPHO0qX33/zoRI+uIG/F9yLNhcOrOWzFUdy36JcXLQji3Rpnn/cD1SVkGA98qI3zPOSDg==",
        "Products": [ 
            {
                "ProductArn": "arn:aws:securityhub:us-west-1:123456789333:product/crowdstrike/crowdstrike-falcon",
                "ProductName": "CrowdStrike Falcon",
                "CompanyName": "CrowdStrike",
                "Description": "CrowdStrike Falcon's single lightweight sensor unifies next-gen antivirus, endpoint detection and response, and 24/7 managed hunting, via the cloud.",
                "Categories": [
                    "Endpoint Detection and Response (EDR)",
                    "AV Scanning and Sandboxing",
                    "Threat Intelligence Feeds and Reports",
                    "Endpoint Forensics",
                    "Network Forensics"
                ],
                "IntegrationTypes": [
                    "SEND_FINDINGS_TO_SECURITY_HUB"
                ],
                "MarketplaceUrl": "https://aws.amazon.com/marketplace/seller-profile?id=a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
                "ActivationUrl": "https://falcon.crowdstrike.com/support/documentation",
                "ProductSubscriptionResourcePolicy": "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"AWS\":\"123456789333\"},\"Action\":[\"securityhub:BatchImportFindings\"],\"Resource\":\"arn:aws:securityhub:us-west-1:123456789012:product-subscription/crowdstrike/crowdstrike-falcon\",\"Condition\":{\"StringEquals\":{\"securityhub:TargetAccount\":\"123456789012\"}}},{\"Effect\":\"Allow\",\"Principal\":{\"AWS\":\"123456789012\"},\"Action\":[\"securityhub:BatchImportFindings\"],\"Resource\":\"arn:aws:securityhub:us-west-1:123456789333:product/crowdstrike/crowdstrike-falcon\",\"Condition\":{\"StringEquals\":{\"securityhub:TargetAccount\":\"123456789012\"}}}]}"
            }
       ]
    }

For more information, see `Managing product integrations <https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-integrations-managing.html>`__ in the *AWS Security Hub User Guide*.
