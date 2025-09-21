**To reject a domain name access association**

The following ``reject-domain-name-access-association`` example rejects a domain name access association between a private custom domain name and VPC endpoint. ::

    aws apigateway reject-domain-name-access-association \
        --domain-name-access-association-arn arn:aws:apigateway:us-west-2:012345678910:/domainnameaccessassociations/domainname/my.private.domain.tld/vpcesource/vpce-abcd1234efg \
        --domain-name-arn arn:aws:apigateway:us-east-1:012345678910:/domainnames/my.private.domain.tld+abcd1234

This command produces no output.

For more information, see `Custom domain names for private APIs in API Gateway <https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-private-custom-domains.html>`__ in the *Amazon API Gateway Developer Guide*.
