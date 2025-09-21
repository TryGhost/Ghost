**Example 1: To describe images in a public registry repository**

The following ``describe-images`` example describes imagesDetails in a repository named ``project-a/nginx-web-app`` in a public registry. ::

    aws ecr-public describe-images \
        --repository-name project-a/nginx-web-app \
        --region us-east-1

Output::

    {
        "imageDetails": [
            {
                "registryId": "123456789012",
                "repositoryName": "project-a/nginx-web-app",
                "imageDigest": "sha256:0d8c93e72e82fa070d49565c00af32abbe8ddfd7f75e39f4306771ae0628c7e8",
                "imageTags": [
                    "temp1.0"
                ],
                "imageSizeInBytes": 123184716,
                "imagePushedAt": "2024-07-23T11:32:49-05:00",
                "imageManifestMediaType": "application/vnd.docker.distribution.manifest.v2+json",
                "artifactMediaType": "application/vnd.docker.container.image.v1+json"
            },
            {
                "registryId": "123456789012",
                "repositoryName": "project-a/nginx-web-app",
                "imageDigest": "sha256:b1f9deb5fe3711a3278379ebbcaefbc5d70a2263135db86bd27a0dae150546c2",
                "imageTags": [
                    "temp2.0"
                ],
                "imageSizeInBytes": 121956548,
                "imagePushedAt": "2024-07-23T11:39:38-05:00",
                "imageManifestMediaType": "application/vnd.docker.distribution.manifest.v2+json",
                "artifactMediaType": "application/vnd.docker.container.image.v1+json"
            },
            {
                "registryId": "123456789012",
                "repositoryName": "project-a/nginx-web-app",
                "imageDigest": "sha256:f7a86a0760e2f8d7eff07e515fc87bf4bac45c35376c06f9a280f15ecad6d7e0",
                "imageTags": [
                    "temp3.0",
                    "latest"
                ],
                "imageSizeInBytes": 232108879,
                "imagePushedAt": "2024-07-22T00:54:34-05:00",
                "imageManifestMediaType": "application/vnd.docker.distribution.manifest.v2+json",
                "artifactMediaType": "application/vnd.docker.container.image.v1+json"
            }
        ]
    }

For more information, see `Describe an image in a public repository <https://docs.aws.amazon.com/AmazonECR/latest/public/docker-push-multi-architecture-image.html>`__ in the *Amazon ECR Public*.

**Example 2: To describe images from the repository by sort imageTags & imagePushedAt**

The following ``describe-images`` example describe images within repository named `project-a/nginx-web-app` in a public registry. ::

    aws ecr-public describe-images \
        --repository-name project-a/nginx-web-app \
        --query 'sort_by(imageDetails,& imagePushedAt)[*].imageTags[*]' \
        --output text

Output::

    temp3.0 latest
    temp1.0
    temp2.0

**Example 3: To describe images from the repository to generate the last 2 image tags pushed in the repository**

The following ``describe-images`` example gets imagetags details from the repository named ``project-a/nginx-web-app`` in a public registry and queries the result to display only the first two records. ::

    aws ecr-public describe-images \
        --repository-name project-a/nginx-web-app  \
        --query 'sort_by(imageDetails,& imagePushedAt)[*].imageTags[*] | [0:2]' \
        --output text

Output::

    temp3.0 latest
    temp1.0
