**To update a CloudFront origin access identity**

The following example updates the origin access identity (OAI) with the ID
``E74FTE3AEXAMPLE``. The only field that you can update is the OAI's
``Comment``.

To update an OAI, you must have the OAI's ID and ``ETag``. The OAI ID is returned in the output of the
`create-cloud-front-origin-access-identity
<create-cloud-front-origin-access-identity.html>`_ and
`list-cloud-front-origin-access-identities
<list-cloud-front-origin-access-identities.html>`_ commands.
To get the ``ETag``, use the
`get-cloud-front-origin-access-identity
<get-cloud-front-origin-access-identity.html>`_ or
`get-cloud-front-origin-access-identity-config
<get-cloud-front-origin-access-identity-config.html>`_ command.
Use the ``--if-match`` option to provide the OAI's ``ETag``.

::

    aws cloudfront update-cloud-front-origin-access-identity \
        --id E74FTE3AEXAMPLE \
        --if-match E2QWRUHEXAMPLE \
        --cloud-front-origin-access-identity-config \
            CallerReference=cli-example,Comment="Example OAI Updated"

You can accomplish the same thing by providing the OAI configuration in a JSON
file, as shown in the following example::

    aws cloudfront update-cloud-front-origin-access-identity \
        --id E74FTE3AEXAMPLE \
        --if-match E2QWRUHEXAMPLE \
        --cloud-front-origin-access-identity-config file://OAI-config.json

The file ``OAI-config.json`` is a JSON document in the current directory that
contains the following::

    {
        "CallerReference": "cli-example",
        "Comment": "Example OAI Updated"
    }

Whether you provide the OAI configuration with a command line argument or a
JSON file, the output is the same::

    {
        "ETag": "E9LHASXEXAMPLE",
        "CloudFrontOriginAccessIdentity": {
            "Id": "E74FTE3AEXAMPLE",
            "S3CanonicalUserId": "cd13868f797c227fbea2830611a26fe0a21ba1b826ab4bed9b7771c9aEXAMPLE",
            "CloudFrontOriginAccessIdentityConfig": {
                "CallerReference": "cli-example",
                "Comment": "Example OAI Updated"
            }
        }
    }
