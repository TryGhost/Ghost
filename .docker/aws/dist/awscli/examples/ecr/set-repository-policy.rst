**To set the repository policy for a repository**

The following ``set-repository-policy`` example attaches a repository policy contained in a file to the ``cluster-autoscaler`` repository. ::

    aws ecr set-repository-policy \
        --repository-name cluster-autoscaler \
        --policy-text file://my-policy.json
  
Contents of ``my-policy.json``::

    {
        "Version" : "2008-10-17",
        "Statement" : [ 
            {
                "Sid" : "allow public pull",
                "Effect" : "Allow",
                "Principal" : "*",
                "Action" : [
                    "ecr:BatchCheckLayerAvailability",
                    "ecr:BatchGetImage",
                    "ecr:GetDownloadUrlForLayer" 
                ]
            }
        ]
    }
  
Output::

    {
        "registryId": "012345678910",
        "repositoryName": "cluster-autoscaler",
        "policyText": "{\n  \"Version\" : \"2008-10-17\",\n  \"Statement\" : [ {\n    \"Sid\" : \"allow public pull\",\n    \"Effect\" : \"Allow\",\n    \"Principal\" : \"*\",\n    \"Action\" : [ \"ecr:BatchCheckLayerAvailability\", \"ecr:BatchGetImage\", \"ecr:GetDownloadUrlForLayer\" ]\n  } ]\n}"
    }
