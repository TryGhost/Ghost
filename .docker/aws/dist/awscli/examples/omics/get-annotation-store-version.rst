**To retrieve the metadata for an annotation store version**

The following ``get-annotation-store-version`` example retrieves the metadata for the requested annotation store version. ::

    aws omics get-annotation-store-version \
        --name my_annotation_store \
        --version-name my_version

Output::

    {
        "storeId": "4934045d1c6d",
        "id": "2a3f4a44aa7b",
        "status": "ACTIVE",
        "versionArn": "arn:aws:omics:us-west-2:555555555555:annotationStore/my_annotation_store/version/my_version",
        "name": "my_annotation_store",
        "versionName": "my_version",
        "creationTime": "2023-07-21T17:15:49.251040+00:00",
        "updateTime": "2023-07-21T17:15:56.434223+00:00",
        "statusMessage": "",
        "versionSizeBytes": 0
    }

For more information, see `Creating new versions of annotation stores <https://docs.aws.amazon.com/omics/latest/dev/annotation-store-versioning.html>`__ in the *AWS HealthOmics User Guide*.