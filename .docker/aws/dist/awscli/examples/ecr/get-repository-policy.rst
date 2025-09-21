**To retrieve the repository policy for a repository**

The following ``get-repository-policy`` example displays details about the repository policy for the ``cluster-autoscaler`` repository. ::

    aws ecr get-repository-policy \
        --repository-name cluster-autoscaler

Output::

    {
        "registryId": "012345678910",
        "repositoryName": "cluster-autoscaler",
        "policyText": "{\n  \"Version\" : \"2008-10-17\",\n  \"Statement\" : [ {\n    \"Sid\" : \"allow public pull\",\n    \"Effect\" : \"Allow\",\n    \"Principal\" : \"*\",\n    \"Action\" : [ \"ecr:BatchCheckLayerAvailability\", \"ecr:BatchGetImage\", \"ecr:GetDownloadUrlForLayer\" ]\n  } ]\n}"
    }
