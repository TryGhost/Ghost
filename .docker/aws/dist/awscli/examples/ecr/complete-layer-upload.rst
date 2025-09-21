**To complete an image layer upload**

The following ``complete-layer-upload`` example completes an image layer upload to the ``layer-test`` repository. ::

    aws ecr complete-layer-upload \
        --repository-name layer-test \
        --upload-id 6cb64b8a-9378-0e33-2ab1-b780fab8a9e9 \
        --layer-digests 6cb64b8a-9378-0e33-2ab1-b780fab8a9e9:48074e6d3a68b39aad8ccc002cdad912d4148c0f92b3729323e
  
Output::

    {
        "uploadId": "6cb64b8a-9378-0e33-2ab1-b780fab8a9e9",
        "layerDigest": "sha256:9a77f85878aa1906f2020a0ecdf7a7e962d57e882250acd773383224b3fe9a02",
        "repositoryName": "layer-test",
        "registryId": "130757420319"
    }
