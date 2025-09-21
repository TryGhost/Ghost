**To delete the repository policy for a repository**

The following ``delete-repository-policy`` example deletes the repository policy for the ``cluster-autoscaler`` repository. ::

    aws ecr delete-repository-policy \
        --repository-name cluster-autoscaler

Output::

    {
        "registryId": "012345678910",
        "repositoryName": "cluster-autoscaler",
        "policyText": "{\n  \"Version\" : \"2008-10-17\",\n  \"Statement\" : [ {\n    \"Sid\" : \"allow public pull\",\n    \"Effect\" : \"Allow\",\n    \"Principal\" : \"*\",\n    \"Action\" : [ \"ecr:BatchCheckLayerAvailability\", \"ecr:BatchGetImage\", \"ecr:GetDownloadUrlForLayer\" ]\n  } ]\n}"
    }
