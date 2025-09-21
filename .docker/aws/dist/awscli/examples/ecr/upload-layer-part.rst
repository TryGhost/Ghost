**To upload a layer part**

This following ``upload-layer-part`` uploads an image layer part to the ``layer-test`` repository. ::

    aws ecr upload-layer-part \
        --repository-name layer-test \
        --upload-id 6cb64b8a-9378-0e33-2ab1-b780fab8a9e9 \
        --part-first-byte 0 \
        --part-last-byte 8323314 \
        --layer-part-blob fileb:///var/lib/docker/image/overlay2/layerdb/sha256/ff986b10a018b48074e6d3a68b39aad8ccc002cdad912d4148c0f92b3729323e/layer.b64
  
Output::

    {
        "uploadId": "6cb64b8a-9378-0e33-2ab1-b780fab8a9e9",
        "registryId": "012345678910",
        "lastByteReceived": 8323314,
        "repositoryName": "layer-test"
    }
