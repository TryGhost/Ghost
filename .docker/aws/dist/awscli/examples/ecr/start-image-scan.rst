**To start an image vulnerability scan**

The following ``start-image-scan`` example starts an image scan for and specified by the image digest in the `specified` repository. ::

    aws ecr start-image-scan \
        --repository-name sample-repo \
        --image-id imageDigest=sha256:74b2c688c700ec95a93e478cdb959737c148df3fbf5ea706abe0318726e885e6

Output::

    {
       "registryId": "012345678910",
       "repositoryName": "sample-repo",
       "imageId": {
           "imageDigest": "sha256:74b2c688c700ec95a93e478cdb959737c148df3fbf5ea706abe0318726e885e6"
       },
       "imageScanStatus": {
           "status": "IN_PROGRESS"
       }
    }

For more information, see `Image Scanning <https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning.html>`__ in the *Amazon ECR User Guide*.
