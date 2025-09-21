**To retrieve details for a lifecycle policy preview**

The following ``get-lifecycle-policy-preview`` example retrieves the result of a lifecycle policy preview for the specified repository in the default registry for an account.

Command::

    aws ecr get-lifecycle-policy-preview \
        --repository-name "project-a/amazon-ecs-sample"

Output::

    {
        "registryId": "012345678910",
        "repositoryName": "project-a/amazon-ecs-sample",
        "lifecyclePolicyText": "{\n    \"rules\": [\n        {\n            \"rulePriority\": 1,\n            \"description\": \"Expire images older than 14 days\",\n            \"selection\": {\n                \"tagStatus\": \"untagged\",\n                \"countType\": \"sinceImagePushed\",\n                \"countUnit\": \"days\",\n                \"countNumber\": 14\n            },\n            \"action\": {\n                \"type\": \"expire\"\n            }\n        }\n    ]\n}\n",
        "status": "COMPLETE",
        "previewResults": [],
        "summary": {
            "expiringImageTotalCount": 0
        }
    }

For more information, see `Lifecycle Policies <https://docs.aws.amazon.com/AmazonECR/latest/userguide/LifecyclePolicies.html>`__ in the *Amazon ECR User Guide*.
