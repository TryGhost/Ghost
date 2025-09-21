**To delete a CloudFront field-level encryption configuration**

The following example deletes the CloudFront field-level encryption
configuration with the ID ``C3KM2WVD605UAY``. To delete a field-level
encryption configuration, you must have its ID and ``ETag``. The ID is returned
in the output of the
`create-field-level-encryption-config
<create-field-level-encryption-config.html>`_ and
`list-field-level-encryption-configs
<list-field-level-encryption-configs.html>`_ commands.
To get the ``ETag``, use the
`get-field-level-encryption
<get-field-level-encryption.html>`_ or
`get-field-level-encryption-config
<get-field-level-encryption-config.html>`_ command.
Use the ``--if-match`` option to provide the configuration's ``ETag``.

::

    aws cloudfront delete-field-level-encryption-config \
        --id C3KM2WVD605UAY \
        --if-match E26M4BIAV81ZF6

When successful, this command has no output.
