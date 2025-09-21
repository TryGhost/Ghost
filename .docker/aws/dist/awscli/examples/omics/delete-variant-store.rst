**To delete a variant store**

The following ``delete-variant-store`` example deletes a variant store named ``my_var_store``. ::

    aws omics delete-variant-store \
        --name my_var_store

Output::

    {
        "status": "DELETING"
    }

For more information, see `Omics Analytics <https://docs.aws.amazon.com/omics/latest/dev/omics-analytics.html>`__ in the *Amazon Omics Developer Guide*.
