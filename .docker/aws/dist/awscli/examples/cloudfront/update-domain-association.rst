**To update a domain association**

The following ``update-domain-association`` example updates a domain association for a distribution tenant with ETag ``E23ZP02F085ABC``. ::

    aws cloudfront update-domain-association \
        --domain example.com \
        --target-resource DistributionTenantId=dt_2x9GhoK0TZRsohWzv1b9It8J1AB \
        --if-match E23ZP02F085ABC

Output::

    {
        "ETag": "ETVPDKIKX0ABC",
        "Domain": "example.com",
        "ResourceId": "dt_2x9GhoK0TZRsohWzv1b9It8J1AB"
    }

For more information, see `Move an alternate domain name to a different distribution <https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/alternate-domain-names-move.html>`__ in the *Amazon CloudFront Developer Guide*.
