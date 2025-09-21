**To get a list of annotation stores**

The following ``list-annotation-stores`` example gets a list of annotation stores. ::

    aws omics list-annotation-stores

Output::

    {
        "annotationStores": [
            {
                "creationTime": "2022-11-23T22:48:39.226492Z",
                "id": "0a91xmplc71f",
                "name": "my_ann_store",
                "reference": {
                    "referenceArn": "arn:aws:omics:us-west-2:123456789012:referenceStore/1234567890/reference/1234567890"
                },
                "status": "ACTIVE",
                "statusMessage": "",
                "storeArn": "arn:aws:omics:us-west-2:123456789012:annotationStore/my_ann_store",
                "storeFormat": "VCF",
                "storeSizeBytes": 0,
                "updateTime": "2022-11-23T22:53:27.372840Z"
            }
        ]
    }

For more information, see `Omics Analytics <https://docs.aws.amazon.com/omics/latest/dev/omics-analytics.html>`__ in the *Amazon Omics Developer Guide*.
