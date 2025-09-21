**To import annotations**

The following ``start-annotation-import-job`` example imports annotations from Amazon S3. ::

    aws omics start-annotation-import-job \
        --destination-name tsv_ann_store \
        --no-run-left-normalization \
        --role-arn arn:aws:iam::123456789012:role/omics-service-role-serviceRole-W8O1XMPL7QZ \
        --items source=s3://omics-artifacts-01d6xmpl4e72dd32/targetedregions.bed.gz

Output::

    {
        "jobId": "984162c7-xmpl-4d23-ab47-286f7950bfbf"
    }

For more information, see `Omics Analytics <https://docs.aws.amazon.com/omics/latest/dev/omics-analytics.html>`__ in the *Amazon Omics Developer Guide*.
