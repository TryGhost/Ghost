**To view an annotation import job**

The following ``get-annotation-import-job`` example gets details about an annotation import job. ::

    aws omics get-annotation-import-job \
        --job-id 984162c7-xmpl-4d23-ab47-286f7950bfbf

Output::

    {
        "creationTime": "2022-11-30T01:40:11.017746Z",
        "destinationName": "tsv_ann_store",
        "id": "984162c7-xmpl-4d23-ab47-286f7950bfbf",
        "items": [
            {
                "jobStatus": "COMPLETED",
                "source": "s3://omics-artifacts-01d6xmpl4e72dd32/targetedregions.bed.gz"
            }
        ],
        "roleArn": "arn:aws:iam::123456789012:role/omics-service-role-serviceRole-W8O1XMPL7QZ",
        "runLeftNormalization": false,
        "status": "COMPLETED",
        "updateTime": "2022-11-30T01:42:39.134009Z"
    }

For more information, see `Omics Analytics <https://docs.aws.amazon.com/omics/latest/dev/omics-analytics.html>`__ in the *Amazon Omics Developer Guide*.
