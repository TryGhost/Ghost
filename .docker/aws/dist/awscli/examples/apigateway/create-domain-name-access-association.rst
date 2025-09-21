**To create a domain name access association**

The following ``create-domain-name-access-association`` example creates a domain name access association between a private custom domain name and VPC endpoint. ::

    aws apigateway create-domain-name-access-association \
        --domain-name-arn arn:aws:apigateway:us-west-2:111122223333:/domainnames/my.private.domain.tld+abcd1234 \
        --access-association-source vpce-abcd1234efg \
        --access-association-source-type VPCE

Output::

    {
        "domainNameAccessAssociationArn": "arn:aws:apigateway:us-west-2:012345678910:/domainnameaccessassociations/domainname/my.private.domain.tld/vpcesource/vpce-abcd1234efg
        "accessAssociationSource": "vpce-abcd1234efg",
        "accessAssociationSourceType": "VPCE",
        "domainNameArn" : "arn:aws:apigateway:us-west-2:111122223333:/domainnames/private.example.com+abcd1234"
    }

For more information, see `Custom domain names for private APIs in API Gateway <https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-private-custom-domains.html>`__ in the *Amazon API Gateway Developer Guide*.
