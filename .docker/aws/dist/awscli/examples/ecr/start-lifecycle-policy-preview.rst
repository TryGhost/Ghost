**To create a lifecycle policy preview**

The following ``start-lifecycle-policy-preview`` example creates a lifecycle policy preview defined by a JSON file for the specified repository. ::

    aws ecr start-lifecycle-policy-preview \
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
       "registryId": "012345678910",
       "repositoryName": "project-a/amazon-ecs-sample",
       "lifecyclePolicyText": "{\n    \"rules\": [\n        {\n            \"rulePriority\": 1,\n            \"description\": \"Expire images older than 14 days\",\n            \"selection\": {\n                \"tagStatus\": \"untagged\",\n                \"countType\": \"sinceImagePushed\",\n                \"countUnit\": \"days\",\n                \"countNumber\": 14\n            },\n            \"action\": {\n                \"type\": \"expire\"\n            }\n        }\n    ]\n}\n",
       "status": "IN_PROGRESS"
    }
