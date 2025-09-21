**To delete an annotation store version**

The following ``delete-annotation-store-versions`` example deletes an annotation store version. ::

    aws omics delete-annotation-store-versions \
        --name my_annotation_store \
        --versions my_version

Output::

    {
        "errors": []
    }

For more information, see `Creating new versions of annotation stores <https://docs.aws.amazon.com/omics/latest/dev/annotation-store-versioning.html>`__ in the *AWS HealthOmics User Guide*.