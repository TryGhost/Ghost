**To import a variant file**

The following ``start-variant-import-job`` example imports a VCF format variant file. ::

    aws omics start-variant-import-job \
        --destination-name my_var_store \
        --no-run-left-normalization  \
        --role-arn arn:aws:iam::123456789012:role/omics-service-role-serviceRole-W8O1XMPL7QZ \
        --items source=s3://omics-artifacts-01d6xmpl4e72dd32/Homo_sapiens_assembly38.known_indels.vcf.gz

Output::

    {
        "jobId": "edd7b8ce-xmpl-47e2-bc99-258cac95a508"
    }

For more information, see `Omics Analytics <https://docs.aws.amazon.com/omics/latest/dev/omics-analytics.html>`__ in the *Amazon Omics Developer Guide*.
