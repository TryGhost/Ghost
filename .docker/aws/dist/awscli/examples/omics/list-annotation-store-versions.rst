**To list all the versions of an annotation store.**

The following ``list-annotation-store-versions`` example lists all versions that exist of an annotation store. ::

    aws omics list-annotation-store-versions \
        --name my_annotation_store

Output::

    {
        "annotationStoreVersions": [
            {
            "storeId": "4934045d1c6d",
            "id": "2a3f4a44aa7b",
            "status": "CREATING",
            "versionArn": "arn:aws:omics:us-west-2:555555555555:annotationStore/my_annotation_store/version/my_version_2",
            "name": "my_annotation_store",
            "versionName": "my_version_2",
            "creation Time": "2023-07-21T17:20:59.380043+00:00",
            "versionSizeBytes": 0
    },
    {
         "storeId": "4934045d1c6d",
         "id": "4934045d1c6d",
         "status": "ACTIVE",
         "versionArn": "arn:aws:omics:us-west-2:555555555555:annotationStore/my_annotation_store/version/my_version_1",
         "name": "my_annotation_store",
         "versionName": "my_version_1",
         "creationTime": "2023-07-21T17:15:49.251040+00:00",
         "updateTime": "2023-07-21T17:15:56.434223+00:00",
         "statusMessage": "",
         "versionSizeBytes": 0
         }
      
    }

For more information, see `Creating new versions of annotation stores <https://docs.aws.amazon.com/omics/latest/dev/annotation-store-versioning.html>`__ in the *AWS HealthOmics User Guide*.