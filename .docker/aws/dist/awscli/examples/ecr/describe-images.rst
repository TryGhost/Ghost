**To describe an image in a repository**

The folowing ``describe-images`` example displays details about an image in the ``cluster-autoscaler`` repository with the tag ``v1.13.6``. ::

    aws ecr describe-images \
        --repository-name cluster-autoscaler \
        --image-ids imageTag=v1.13.6

Output::

    {
        "imageDetails": [
            {
                "registryId": "012345678910",
                "repositoryName": "cluster-autoscaler",
                "imageDigest": "sha256:4a1c6567c38904384ebc64e35b7eeddd8451110c299e3368d2210066487d97e5",
                "imageTags": [
                    "v1.13.6"
                ],
                "imageSizeInBytes": 48318255,
                "imagePushedAt": 1565128275.0
            }
        ]
    }
