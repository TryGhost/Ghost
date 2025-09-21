**To enable Contributor Insights on a table**

The following ``update-contributor-insights`` example enables Contributor Insights on the ``MusicCollection`` table and the ``AlbumTitle-index`` global secondary index. ::

    aws dynamodb update-contributor-insights \
        --table-name MusicCollection \
        --index-name AlbumTitle-index \
        --contributor-insights-action ENABLE

Output::

    {
        "TableName": "MusicCollection",
        "IndexName": "AlbumTitle-index",
        "ContributorInsightsStatus": "ENABLING"
    }

For more information, see `Analyzing Data Access Using CloudWatch Contributor Insights for DynamoDB <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/contributorinsights.html>`__ in the *Amazon DynamoDB Developer Guide*.