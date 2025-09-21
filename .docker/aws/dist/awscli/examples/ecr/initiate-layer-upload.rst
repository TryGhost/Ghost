**To initiate an image layer upload**

The following ``initiate-layer-upload`` example initiates an image layer upload to the ``layer-test`` repository. ::

    aws ecr initiate-layer-upload \
        --repository-name layer-test
  
Output::

    {
        "partSize": 10485760,
        "uploadId": "6cb64b8a-9378-0e33-2ab1-b780fab8a9e9"
    }
