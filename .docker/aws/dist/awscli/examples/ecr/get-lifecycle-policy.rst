**To retrieve a lifecycle policy**

The following ``get-lifecycle-policy`` example displays details of the lifecycle policy for the specified repository in the default registry for the account. ::

    aws ecr get-lifecycle-policy \
        --repository-name "project-a/amazon-ecs-sample"

Output::

    {
         "registryId": "123456789012",
         "repositoryName": "project-a/amazon-ecs-sample",
         "lifecyclePolicyText": "{\"rules\":[{\"rulePriority\":1,\"description\":\"Expire images older than 14 days\",\"selection\":{\"tagStatus\":\"untagged\",\"countType\":\"sinceImagePushed\",\"countUnit\":\"days\",\"countNumber\":14},\"action\":{\"type\":\"expire\"}}]}",
         "lastEvaluatedAt": 1504295007.0
    }

For more information, see `Lifecycle Policies <https://docs.aws.amazon.com/AmazonECR/latest/userguide/LifecyclePolicies.html>`__ in the *Amazon ECR User Guide*.
