**To view Contributor Insights settings for a DynamoDB table**

The following ``describe-contributor-insights`` example displays the Contributor Insights settings for the ``MusicCollection`` table and the ``AlbumTitle-index`` global secondary index. ::

    aws dynamodb describe-contributor-insights \
        --table-name MusicCollection \
        --index-name AlbumTitle-index

Output::

    {
        "TableName": "MusicCollection",
        "IndexName": "AlbumTitle-index",
        "ContributorInsightsRuleList": [
            "DynamoDBContributorInsights-PKC-MusicCollection-1576629651520",
            "DynamoDBContributorInsights-SKC-MusicCollection-1576629651520",
            "DynamoDBContributorInsights-PKT-MusicCollection-1576629651520",
            "DynamoDBContributorInsights-SKT-MusicCollection-1576629651520"
        ],
        "ContributorInsightsStatus": "ENABLED",
        "LastUpdateDateTime": 1576629654.78
    }

For more information, see `Analyzing Data Access Using CloudWatch Contributor Insights for DynamoDB <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/contributorinsights.html>`__ in the *Amazon DynamoDB Developer Guide*.