**Example 1: To list all domain name access associations**

The following ``get-domain-name-access-associations`` example lists all domain name access associations. ::

    aws apigateway get-domain-name-access-associations

Output::

    {
        "items": [
            {
            "domainNameAccessAssociationArn": "arn:aws:apigateway:us-west-2:012345678910:/domainnameaccessassociations/domainname/my.private.domain.tld/vpcesource/vpce-abcd1234efg
            "accessAssociationSource": "vpce-abcd1234efg",
            "accessAssociationSourceType": "VPCE",
            "domainNameArn" : "arn:aws:apigateway:us-west-2:111122223333:/domainnames/private.example.com+abcd1234"
            }
        ]
    }

For more information, see `Custom domain names for private APIs in API Gateway <https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-private-custom-domains.html>`__ in the *Amazon API Gateway Developer Guide*.

**Example 2: To list all domain name access associations owned by this AWS account**

The following ``get-domain-name-access-associations`` example lists all the domain name access associations owned by the current AWS account. ::

    aws apigateway get-domain-name-access-associations \
        --resource-owner SELF

Output::

    {
        "items": [
            {
            "domainNameAccessAssociationArn": "arn:aws:apigateway:us-west-2:012345678910:/domainnameaccessassociations/domainname/my.private.domain.tld/vpcesource/vpce-abcd1234efg
            "accessAssociationSource": "vpce-abcd1234efg",
            "accessAssociationSourceType": "VPCE",
            "domainNameArn" : "arn:aws:apigateway:us-west-2:111122223333:/domainnames/private.example.com+abcd1234"
            }
        ]
    }

For more information, see `Custom domain names for private APIs in API Gateway <https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-private-custom-domains.html>`__ in the *Amazon API Gateway Developer Guide*.
