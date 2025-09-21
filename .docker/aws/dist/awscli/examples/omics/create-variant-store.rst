**To create a variant store**

The following ``create-variant-store`` example creates a variant store named ``my_var_store``. ::

    aws omics create-variant-store \
        --name my_var_store \
        --reference referenceArn=arn:aws:omics:us-west-2:123456789012:referenceStore/1234567890/reference/1234567890

Output::

    {
        "creationTime": "2022-11-23T22:09:07.534499Z",
        "id": "02dexmplcfdd",
        "name": "my_var_store",
        "reference": {
            "referenceArn": "arn:aws:omics:us-west-2:123456789012:referenceStore/1234567890/reference/1234567890"
        },
        "status": "CREATING"
    }

For more information, see `Omics Analytics <https://docs.aws.amazon.com/omics/latest/dev/omics-analytics.html>`__ in the *Amazon Omics Developer Guide*.
