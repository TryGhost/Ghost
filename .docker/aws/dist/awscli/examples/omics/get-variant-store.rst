**To view a variant store**

The following ``get-variant-store`` example gets details about a variant store. ::

    aws omics get-variant-store \
        --name my_var_store

Output::

    {
        "creationTime": "2022-11-23T22:09:07.534499Z",
        "id": "02dexmplcfdd",
        "name": "my_var_store",
        "reference": {
            "referenceArn": "arn:aws:omics:us-west-2:123456789012:referenceStore/1234567890/reference/1234567890"
        },
        "status": "CREATING",
        "storeArn": "arn:aws:omics:us-west-2:123456789012:variantStore/my_var_store",
        "storeSizeBytes": 0,
        "tags": {},
        "updateTime": "2022-11-23T22:09:24.931711Z"
    }

For more information, see `Omics Analytics <https://docs.aws.amazon.com/omics/latest/dev/omics-analytics.html>`__ in the *Amazon Omics Developer Guide*.
