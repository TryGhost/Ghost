**To get a CloudFront origin access identity**

The following example gets the CloudFront origin access identity (OAI) with the
ID ``E74FTE3AEXAMPLE``, including its ``ETag`` and the associated S3 canonical
ID. The OAI ID is returned in the output of the
`create-cloud-front-origin-access-identity
<create-cloud-front-origin-access-identity.html>`_ and
`list-cloud-front-origin-access-identities
<list-cloud-front-origin-access-identities.html>`_ commands.

::

    aws cloudfront get-cloud-front-origin-access-identity --id E74FTE3AEXAMPLE

Output::

    {
        "ETag": "E2QWRUHEXAMPLE",
        "CloudFrontOriginAccessIdentity": {
            "Id": "E74FTE3AEXAMPLE",
            "S3CanonicalUserId": "cd13868f797c227fbea2830611a26fe0a21ba1b826ab4bed9b7771c9aEXAMPLE",
            "CloudFrontOriginAccessIdentityConfig": {
                "CallerReference": "cli-example",
                "Comment": "Example OAI"
            }
        }
    }
