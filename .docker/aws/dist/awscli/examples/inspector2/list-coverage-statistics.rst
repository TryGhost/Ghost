**Example 1: To list coverage statistics by groups**

The following ``list-coverage-statistics`` example lists the coverage statistics of your AWS environment by groups. ::

    aws inspector2 list-coverage-statistics \
       --group-by RESOURCE_TYPE 

Output::

    {
        "countsByGroup": [
            {
                "count": 56,
                "groupKey": "AWS_LAMBDA_FUNCTION"
            },
            {
                "count": 27,
                "groupKey": "AWS_ECR_REPOSITORY"
            },
            {
                "count": 18,
                "groupKey": "AWS_EC2_INSTANCE"
            },
            {
                "count": 3,
                "groupKey": "AWS_ECR_CONTAINER_IMAGE"
            },
            {
                "count": 1,
                "groupKey": "AWS_ACCOUNT"
            }
        ],
        "totalCounts": 105
    }

For more information, see `Assessing Amazon Inspector coverage of your AWS environment <https://docs.aws.amazon.com/inspector/latest/user/assessing-coverage.html>`__ in the *Amazon Inspector User Guide*.

**Example 2: To list coverage statistics by resource type**

The following ``list-coverage-statistics`` example lists the coverage statistics of your AWS environment by resource type. ::

    aws inspector2 list-coverage-statistics 
        --filter-criteria '{"resourceType":[{"comparison":"EQUALS","value":"AWS_ECR_REPOSITORY"}]}' 
        --group-by SCAN_STATUS_REASON

Output::

    {
        "countsByGroup": [
            {
                "count": 27,
                "groupKey": "SUCCESSFUL"
            }
        ],
        "totalCounts": 27
    }

For more information, see `Assessing Amazon Inspector coverage of your AWS environment <https://docs.aws.amazon.com/inspector/latest/user/assessing-coverage.html>`__ in the *Amazon Inspector User Guide*.

**Example 3: To list coverage statistics by ECR repository name**

The following ``list-coverage-statistics`` example lists the coverage statistics of your AWS environment by ECR repository name. ::

    aws inspector2 list-coverage-statistics
       --filter-criteria '{"ecrRepositoryName":[{"comparison":"EQUALS","value":"debian"}]}'
       --group-by SCAN_STATUS_REASON

Output::

    {
        "countsByGroup": [
            {
                "count": 3,
                "groupKey": "SUCCESSFUL"
            }
        ],
        "totalCounts": 3
    }

For more information, see `Assessing Amazon Inspector coverage of your AWS environment <https://docs.aws.amazon.com/inspector/latest/user/assessing-coverage.html>`__ in the *Amazon Inspector User Guide*.
