**Example 1: To delete an image by using image digest ids, the image and all of its tags are deleted within a repository in a public registry**

The following ``batch-delete-image`` example deletes an image by specifying the image digest.::

    aws ecr-public batch-delete-image \
        --repository-name project-a/nginx-web-app \
        --image-ids imageDigest=sha256:b1f9deb5fe3711a3278379ebbcaefbc5d70a2263135db86bd27a0dae150546c2 

Output::

    {
    "imageIds": [
        {
            "imageDigest": "sha256:b1f9deb5fe3711a3278379ebbcaefbc5d70a2263135db86bd27a0dae150546c2",
            "imageTag": "latest"
        }
    ],
    "failures": []
    }

For more information, see `Deleting an image in a public repository <https://docs.aws.amazon.com/AmazonECR/latest/public/public-image-delete.html>`__ in the *Amazon ECR Public User Guide*.

**Example 2: To delete any image by specifying the tag associated with the image you want to delete from the repository.**

The following ``batch-delete-image`` example deletes an image by specifying the tag associated with the image repository named ``project-a/nginx-web-app`` in a public registry. If you have only one tag and execute this command, it will remove the image. Otherwise, if you have multiple tags for the same image, specify one, and only the tag is removed from repository and not the image. ::

    aws ecr-public batch-delete-image \
        --repository-name project-a/nginx-web-app \
        --image-ids imageTag=_temp

Output::

    {
        "imageIds": [
            {
                "imageDigest": "sha256:f7a86a0760e2f8d7eff07e515fc87bf4bac45c35376c06f9a280f15ecad6d7e0",
                "imageTag": "_temp"
            }
        ],
        "failures": []
    }

For more information, see `Deleting an image in a public repository <https://docs.aws.amazon.com/AmazonECR/latest/public/public-image-delete.html>`__ in the *Amazon ECR Public User Guide*.

**Example 3: To delete multiple images, you can specify multiple image tags or image digests in the request for a repository in a public registry.**

The following ``batch-delete-image`` example delete multiple images from a repository named `project-a/nginx-web-app` by specifying multiple image tags or image digests in the request. ::

    aws ecr-public batch-delete-image \
        --repository-name project-a/nginx-web-app \
        --image-ids imageTag=temp2.0  imageDigest=sha256:47ba980bc055353d9c0af89b1894f68faa43ca93856917b8406316be86f01278

Output::

   {
        "imageIds": [
            {
                "imageDigest": "sha256:47ba980bc055353d9c0af89b1894f68faa43ca93856917b8406316be86f01278"
            },
            {
                "imageDigest": "sha256:f7a86a0760e2f8d7eff07e515fc87bf4bac45c35376c06f9a280f15ecad6d7e0",
                "imageTag": "temp2.0"
            }
        ],
        "failures": []
    }

For more information, see `Deleting an image in a public repository <https://docs.aws.amazon.com/AmazonECR/latest/public/public-image-delete.html>`__ in the *Amazon ECR Public User Guide*.

**Example 4: To delete an image in cross AWS Account using registry-id and imagedigest ids, the image and all of its tags are deleted within a repository in a public registry**

The following ``batch-delete-image`` example deletes an image by specifying the image digest in the cross AWS Account.::

    aws ecr-public batch-delete-image \
        --registry-id 123456789098 \
        --repository-name project-a/nginx-web-app \
        --image-ids imageDigest=sha256:b1f9deb5fe3711a3278379ebbcaefbc5d70a2263135db86bd27a0dae150546c2 \
        --region us-east-1

Output::

    {
        "imageIds": [
            {
                "imageDigest": "sha256:b1f9deb5fe3711a3278379ebbcaefbc5d70a2263135db86bd27a0dae150546c2",
                "imageTag": "temp2.0"
            }
        ],
        "failures": []
    }

For more information, see `Deleting an image in a public repository <https://docs.aws.amazon.com/AmazonECR/latest/public/public-image-delete.html>`__ in the *Amazon ECR Public User Guide*.
