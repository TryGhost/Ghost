**To update a variant store**

The following ``update-variant-store`` example updates the description of a variant store named ``my_var_store``. ::

    aws omics update-variant-store \
        --name my_var_store \
        --description "variant store"

Output::

    {
        "creationTime": "2022-11-23T22:09:07.534499Z",
        "description": "variant store",
        "id": "02dexmplcfdd",
        "name": "my_var_store",
        "reference": {
            "referenceArn": "arn:aws:omics:us-west-2:123456789012:referenceStore/1234567890/reference/1234567890"
        },
        "status": "ACTIVE",
        "updateTime": "2022-12-05T18:23:37.686402Z"
    }

For more information, see `Omics Analytics <https://docs.aws.amazon.com/omics/latest/dev/omics-analytics.html>`__ in the *Amazon Omics Developer Guide*.
