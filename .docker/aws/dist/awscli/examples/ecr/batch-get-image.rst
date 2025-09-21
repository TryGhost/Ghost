**Example 1: To get an image**

The following ``batch-get-image`` example gets an image with the tag ``v1.13.6`` in a repository called
``cluster-autoscaler`` in the default registry for an account. ::

    aws ecr batch-get-image \
        --repository-name cluster-autoscaler \
        --image-ids imageTag=v1.13.6
  
Output::

    {
        "images": [
            {
                "registryId": "012345678910",
                "repositoryName": "cluster-autoscaler",
                "imageId": {
                    "imageDigest": "sha256:4a1c6567c38904384ebc64e35b7eeddd8451110c299e3368d2210066487d97e5",
                    "imageTag": "v1.13.6"
                },
                "imageManifest": "{\n   \"schemaVersion\": 2,\n   \"mediaType\": \"application/vnd.docker.distribution.manifest.v2+json\",\n   \"config\": {\n      \"mediaType\": \"application/vnd.docker.container.image.v1+json\",\n      \"size\": 2777,\n      \"digest\": \"sha256:6171c7451a50945f8ddd72f7732cc04d7a0d1f48138a426b2e64387fdeb834ed\"\n   },\n   \"layers\": [\n      {\n         \"mediaType\": \"application/vnd.docker.image.rootfs.diff.tar.gzip\",\n         \"size\": 17743696,\n         \"digest\": \"sha256:39fafc05754f195f134ca11ecdb1c9a691ab0848c697fffeb5a85f900caaf6e1\"\n      },\n      {\n         \"mediaType\": \"application/vnd.docker.image.rootfs.diff.tar.gzip\",\n         \"size\": 2565026,\n         \"digest\": \"sha256:8c8a779d3a537b767ae1091fe6e00c2590afd16767aa6096d1b318d75494819f\"\n      },\n      {\n         \"mediaType\": \"application/vnd.docker.image.rootfs.diff.tar.gzip\",\n         \"size\": 28005981,\n         \"digest\": \"sha256:c44ba47496991c9982ee493b47fd25c252caabf2b4ae7dd679c9a27b6a3c8fb7\"\n      },\n      {\n         \"mediaType\": \"application/vnd.docker.image.rootfs.diff.tar.gzip\",\n         \"size\": 775,\n         \"digest\": \"sha256:e2c388b44226544363ca007be7b896bcce1baebea04da23cbd165eac30be650f\"\n      }\n   ]\n}"
            }
        ],
        "failures": []
    }

**Example 2: To get multiple images**

The following ``batch-get-image`` example displays details of all images tagged with ``prod`` and ``team1`` in the specified repository. ::

    aws ecr batch-get-image \
        --repository-name MyRepository \
        --image-ids imageTag=prod imageTag=team1

Output::

    {
        "images": [
            {
                "registryId": "123456789012",
                "repositoryName": "MyRepository",
                "imageId": {
                    "imageDigest": "sha256:123456789012",
                    "imageTag": "prod"
                },
                "imageManifest": "manifestExample1"
            },
            {
                "registryId": "567890121234",
                "repositoryName": "MyRepository",
                "imageId": {
                    "imageDigest": "sha256:123456789012",
                    "imageTag": "team1"
                },
                "imageManifest": "manifestExample2"
            }
        ],
        "failures": []
    }

For more information, see `Images <https://docs.aws.amazon.com/AmazonECR/latest/userguide/images.html>`__ in the *Amazon ECR User Guide*.