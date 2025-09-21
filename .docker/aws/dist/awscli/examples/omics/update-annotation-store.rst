**To update an annotation store**

The following ``update-annotation-store`` example updates the description of an annotation store named ``my_vcf_store``. ::

    aws omics update-annotation-store \
        --name my_vcf_store \
        --description "VCF annotation store"

Output::

    {
        "creationTime": "2022-12-05T18:00:56.101860Z",
        "description": "VCF annotation store",
        "id": "bd6axmpl2444",
        "name": "my_vcf_store",
        "reference": {
            "referenceArn": "arn:aws:omics:us-west-2:123456789012:referenceStore/1234567890/reference/1234567890"
        },
        "status": "ACTIVE",
        "storeFormat": "VCF",
        "updateTime": "2022-12-05T18:13:16.100051Z"
    }

For more information, see `Omics Analytics <https://docs.aws.amazon.com/omics/latest/dev/omics-analytics.html>`__ in the *Amazon Omics Developer Guide*.
