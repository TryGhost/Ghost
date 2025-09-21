**Example 1: To describe image tag details in public repository**

The following ``describe-image-tags`` example describe imagetags in the ``project-a/nginx-web-app`` sample repository. ::

    aws ecr-public describe-image-tags \
        --repository-name project-a/nginx-web-app \
        --region us-east-1

Output::

    {
        "imageTagDetails": [
            {
                "imageTag": "latest",
                "createdAt": "2024-07-10T22:29:00-05:00",
                "imageDetail": {
                    "imageDigest": "sha256:b1f9deb5fe3711a3278379ebbcaefbc5d70a2263135db86bd27a0dae150546c2",
                    "imageSizeInBytes": 121956548,
                    "imagePushedAt": "2024-07-10T22:29:00-05:00",
                    "imageManifestMediaType": "application/vnd.docker.distribution.manifest.v2+json",
                    "artifactMediaType": "application/vnd.docker.container.image.v1+json"
                }
            }
        ]
    }
