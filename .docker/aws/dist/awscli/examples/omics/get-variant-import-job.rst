**To view a variant import job**

The following ``get-variant-import-job`` example gets details about a variant import job. ::

    aws omics get-variant-import-job \
        --job-id edd7b8ce-xmpl-47e2-bc99-258cac95a508

Output::

    {
        "creationTime": "2022-11-23T22:42:50.037812Z",
        "destinationName": "my_var_store",
        "id": "edd7b8ce-xmpl-47e2-bc99-258cac95a508",
        "items": [
            {
                "jobStatus": "IN_PROGRESS",
                "source": "s3://omics-artifacts-01d6xmpl4e72dd32/Homo_sapiens_assembly38.known_indels.vcf.gz"
            }
        ],
        "roleArn": "arn:aws:iam::123456789012:role/omics-service-role-serviceRole-W8O1XMPL7QZ",
        "runLeftNormalization": false,
        "status": "IN_PROGRESS",
        "updateTime": "2022-11-23T22:43:05.898309Z"
    }

For more information, see `Omics Analytics <https://docs.aws.amazon.com/omics/latest/dev/omics-analytics.html>`__ in the *Amazon Omics Developer Guide*.
