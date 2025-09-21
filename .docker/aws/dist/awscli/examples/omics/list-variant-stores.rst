**To get a list of variant stores**

The following ``list-variant-stores`` example gets a list of variant stores. ::

    aws omics list-variant-stores

Output::

    {
        "variantStores": [
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
                "updateTime": "2022-11-23T22:09:24.931711Z"
            },
            {
                "creationTime": "2022-09-23T23:00:09.140265Z",
                "id": "8777xmpl1a24",
                "name": "myvstore0",
                "status": "ACTIVE",
                "storeArn": "arn:aws:omics:us-west-2:123456789012:variantStore/myvstore0",
                "storeSizeBytes": 0,
                "updateTime": "2022-09-23T23:03:26.013220Z"
            }
        ]
    }

For more information, see `Omics Analytics <https://docs.aws.amazon.com/omics/latest/dev/omics-analytics.html>`__ in the *Amazon Omics Developer Guide*.
