**To create a new version of an annotation store**

The following ``create-annotation-store-version`` example creates a new version of an annotation store. ::

    aws omics create-annotation-store-version \
        --name my_annotation_store \
        --version-name my_version

Output::

    {
        "creationTime": "2023-07-21T17:15:49.251040+00:00",
        "id": "3b93cdef69d2",
        "name": "my_annotation_store",
        "reference": {
            "referenceArn": "arn:aws:omics:us-west-2:555555555555:referenceStore/6505293348/reference/5987565360"
        },
        "status": "CREATING",
        "versionName": "my_version"
    }

For more information, see `Creating new versions of annotation stores <https://docs.aws.amazon.com/omics/latest/dev/annotation-store-versioning.html>`__ in the *AWS HealthOmics User Guide*.