**Example 1: To view a list of Contributor Insights summaries**

The following ``list-contributor-insights`` example displays a list of Contributor Insights summaries. ::

    aws dynamodb list-contributor-insights

Output::

    {
        "ContributorInsightsSummaries": [
            {
                "TableName": "MusicCollection",
                "IndexName": "AlbumTitle-index",
                "ContributorInsightsStatus": "ENABLED"
            },
            {
                "TableName": "ProductCatalog",
                "ContributorInsightsStatus": "ENABLED"
            },
            {
                "TableName": "Forum",
                "ContributorInsightsStatus": "ENABLED"
            },
            {
                "TableName": "Reply",
                "ContributorInsightsStatus": "ENABLED"
            },
            {
                "TableName": "Thread",
                "ContributorInsightsStatus": "ENABLED"
            }
        ]
    }

For more information, see `Analyzing Data Access Using CloudWatch Contributor Insights for DynamoDB <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/contributorinsights.html>`__ in the *Amazon DynamoDB Developer Guide*.

**Example 2: To limit the number of items returned**

The following example limits the number of items returned to 4. The response includes a ``NextToken`` value with which to retrieve the next page of results. ::

    aws dynamodb list-contributor-insights \
        --max-results 4

Output::

    {
        "ContributorInsightsSummaries": [
            {
                "TableName": "MusicCollection",
                "IndexName": "AlbumTitle-index",
                "ContributorInsightsStatus": "ENABLED"
            },
            {
                "TableName": "ProductCatalog",
                "ContributorInsightsStatus": "ENABLED"
            },
            {
                "TableName": "Forum",
                "ContributorInsightsStatus": "ENABLED"
            }
        ],
        "NextToken": "abCDeFGhiJKlmnOPqrSTuvwxYZ1aBCdEFghijK7LM51nOpqRSTuv3WxY3ZabC5dEFGhI2Jk3LmnoPQ6RST9"
    }

For more information, see `Analyzing Data Access Using CloudWatch Contributor Insights for DynamoDB <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/contributorinsights.html>`__ in the *Amazon DynamoDB Developer Guide*.

**Example 3: To retrieve the next page of results**

The following command uses the ``NextToken`` value from a previous call to the ``list-contributor-insights`` command to retrieve another page of results. Since the response in this case does not include a ``NextToken`` value, we know that we have reached the end of the results. ::

    aws dynamodb list-contributor-insights \
        --max-results 4 \
        --next-token abCDeFGhiJKlmnOPqrSTuvwxYZ1aBCdEFghijK7LM51nOpqRSTuv3WxY3ZabC5dEFGhI2Jk3LmnoPQ6RST9

Output::

    {
        "ContributorInsightsSummaries": [
            {
                "TableName": "Reply",
                "ContributorInsightsStatus": "ENABLED"
            },
            {
                "TableName": "Thread",
                "ContributorInsightsStatus": "ENABLED"
            }
        ]
    }

For more information, see `Analyzing Data Access Using CloudWatch Contributor Insights for DynamoDB <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/contributorinsights.html>`__ in the *Amazon DynamoDB Developer Guide*.