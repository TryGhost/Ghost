**To update the image scanning configuration for a repository**

The following ``put-image-scanning-configuration`` example updates the image scanning configuration for the specified repository. ::

    aws ecr put-image-scanning-configuration \
        --repository-name sample-repo \
        --image-scanning-configuration scanOnPush=true

Output::

    {
       "registryId": "012345678910",
       "repositoryName": "sample-repo",
       "imageScanningConfiguration": {
         "scanOnPush": true
       }
    }

For more information, see `Image Scanning <https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning.html>`__ in the *Amazon ECR User Guide*.
