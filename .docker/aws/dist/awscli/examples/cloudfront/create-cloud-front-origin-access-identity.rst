**To create a CloudFront origin access identity**

The following example creates a CloudFront origin access identity (OAI) by
providing the OAI configuration as a command line argument::

    aws cloudfront create-cloud-front-origin-access-identity \
        --cloud-front-origin-access-identity-config \
            CallerReference="cli-example",Comment="Example OAI"

You can accomplish the same thing by providing the OAI configuration in a JSON
file, as shown in the following example::

    aws cloudfront create-cloud-front-origin-access-identity \
        --cloud-front-origin-access-identity-config file://OAI-config.json

The file ``OAI-config.json`` is a JSON document in the current directory that
contains the following::

    {
        "CallerReference": "cli-example",
        "Comment": "Example OAI"
    }

Whether you provide the OAI configuration with a command line argument or a
JSON file, the output is the same::

    {
        "Location": "https://cloudfront.amazonaws.com/2019-03-26/origin-access-identity/cloudfront/E74FTE3AEXAMPLE",
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
