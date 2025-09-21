**To view an annotation store**

The following ``get-annotation-store`` example gets details about an annotation store named ``my_ann_store``. ::

    aws omics get-annotation-store \
        --name my_ann_store

Output::

    {
        "creationTime": "2022-11-23T22:48:39.226492Z",
        "id": "0a91xmplc71f",
        "name": "my_ann_store",
        "reference": {
            "referenceArn": "arn:aws:omics:us-west-2:123456789012:referenceStore/1234567890/reference/1234567890"
        },
        "status": "CREATING",
        "storeArn": "arn:aws:omics:us-west-2:123456789012:annotationStore/my_ann_store",
        "storeFormat": "VCF",
        "storeSizeBytes": 0,
        "tags": {}
    }

For more information, see `Omics Analytics <https://docs.aws.amazon.com/omics/latest/dev/omics-analytics.html>`__ in the *Amazon Omics Developer Guide*.
