**To delete an annotation store**

The following ``delete-annotation-store`` example deletes an annotation store named ``my_vcf_store``. ::

    aws omics delete-annotation-store \
        --name my_vcf_store

Output::

    {
        "status": "DELETING"
    }

For more information, see `Omics Analytics <https://docs.aws.amazon.com/omics/latest/dev/omics-analytics.html>`__ in the *Amazon Omics Developer Guide*.
