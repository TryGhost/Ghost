**To delete the lifecycle policy for a repository**

The following ``delete-lifecycle-policy`` example deletes the lifecycle policy for the ``hello-world`` repository. ::

    aws ecr delete-lifecycle-policy \
        --repository-name hello-world

Output::

    {
        "registryId": "012345678910",
        "repositoryName": "hello-world",
        "lifecyclePolicyText": "{\"rules\":[{\"rulePriority\":1,\"description\":\"Remove untagged images.\",\"selection\":{\"tagStatus\":\"untagged\",\"countType\":\"sinceImagePushed\",\"countUnit\":\"days\",\"countNumber\":10},\"action\":{\"type\":\"expire\"}}]}",
        "lastEvaluatedAt": 0.0
    }
