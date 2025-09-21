**Example 1: To delete an image**

The following ``batch-delete-image`` example deletes an image with the tag ``precise`` in the specified repository in the default registry for an account. ::

    aws ecr batch-delete-image \
        --repository-name ubuntu \
        --image-ids imageTag=precise

Output::

    {
        "failures": [],
        "imageIds": [
            {
                "imageTag": "precise",
                "imageDigest": "sha256:19665f1e6d1e504117a1743c0a3d3753086354a38375961f2e665416ef4b1b2f"
            }
        ]
    }

**Example 2: To delete multiple images**

The following ``batch-delete-image`` example deletes all images tagged with ``prod`` and ``team1`` in the specified repository. ::

    aws ecr batch-delete-image \
        --repository-name MyRepository \
        --image-ids imageTag=prod imageTag=team1

Output::

    {
        "imageIds": [
            {
                "imageDigest": "sha256:123456789012",
                "imageTag": "prod"
            },
            {
                "imageDigest": "sha256:567890121234",
                "imageTag": "team1"
            }
        ],
        "failures": []
    }

For more information, see `Deleting an Image <https://docs.aws.amazon.com/AmazonECR/latest/userguide/delete_image.html>`__ in the *Amazon ECR User Guide*.