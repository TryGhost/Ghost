**To create a lifecycle policy**

The following ``put-lifecycle-policy`` example creates a lifecycle policy for the specified repository in the default registry for an account. ::

    aws ecr put-lifecycle-policy \
        --repository-name "project-a/amazon-ecs-sample" \
        --lifecycle-policy-text "file://policy.json"

Contents of ``policy.json``::

    {
       "rules": [
           {
               "rulePriority": 1,
               "description": "Expire images older than 14 days",
               "selection": {
                   "tagStatus": "untagged",
                   "countType": "sinceImagePushed",
                   "countUnit": "days",
                   "countNumber": 14
               },
               "action": {
                   "type": "expire"
               }
           }
       ]
    }

Output::

    {
       "registryId": "<aws_account_id>",
       "repositoryName": "project-a/amazon-ecs-sample",
       "lifecyclePolicyText": "{\"rules\":[{\"rulePriority\":1,\"description\":\"Expire images older than 14 days\",\"selection\":{\"tagStatus\":\"untagged\",\"countType\":\"sinceImagePushed\",\"countUnit\":\"days\",\"countNumber\":14},\"action\":{\"type\":\"expire\"}}]}"
    }

For more information, see `Lifecycle Policies <https://docs.aws.amazon.com/AmazonECR/latest/userguide/LifecyclePolicies.html>`__ in the *Amazon ECR User Guide*.
