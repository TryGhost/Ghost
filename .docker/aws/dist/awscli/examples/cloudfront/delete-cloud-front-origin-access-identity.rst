**To delete a CloudFront origin access identity**

The following example deletes the origin access identity (OAI) with the ID
``E74FTE3AEXAMPLE``. To delete an OAI, you must have the OAI's ID and ``ETag``.
The OAI ID is returned in the output of the
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

    aws cloudfront delete-cloud-front-origin-access-identity \
        --id E74FTE3AEXAMPLE \
        --if-match E2QWRUHEXAMPLE

When successful, this command has no output.
