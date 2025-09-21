**To list domain conflicts for a CloudFront distribution**

The following ``list-domain-conflicts`` example lists domain conflicts for a CloudFront distribution. ::

    aws cloudfront list-domain-conflicts \
        --domain example.com \
        --domain-control-validation-resource "DistributionTenantId=dt_2x9GhoK0TZRsohWzv1b9It8J1AB"

Output::

    {
        "DomainConflicts": [
            {
                "Domain": "example.com",
                "ResourceType": "distribution-tenant",
                "ResourceId": "***************ohWzv1b9It8J1AB",
                "AccountId": "123456789012"
            }
        ]
    }

For more information, see `Move an alternate domain name to a different distribution <https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/alternate-domain-names-move.html>`__ in the *Amazon CloudFront Developer Guide*.
