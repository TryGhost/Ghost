**To retrieve a list of Contributor Insights rules**

The following ``describe-insight-rules`` example shows all the Contributor Insight rules in the specified account. ::

    aws cloudwatch describe-insight-rules 

Output::

    {
        "InsightRules": [
            {
                "Name": "Rule-A",
                "State": "ENABLED",
                "Schema": "CloudWatchLogRule/1",
                "Definition": "{\n\t\"AggregateOn\": \"Count\",\n\t\"Contribution\": {\n\t\t\"Filters\": [],\n\t\t\"Keys\": [\n\t\t\t\"$.requestId\"\n\t\t]\n\t},\n\t\"LogFormat\": \"JSON\",\n\t\"Schema\": {\n\t\t\"Name\": \"CloudWatchLogRule\",\n\t\t\"Version\": 1\n\t},\n\t\"LogGroupARNs\": [\n\t\t\"arn:aws:logs:us-east-1:123456789012:log-group:demo\"\n\t]\n}",
                "ManagedRule": false
            },
            {
                "Name": "Rule-B",
                "State": "ENABLED",
                "Schema": "CloudWatchLogRule/1",
                "Definition": "{\n\t\"AggregateOn\": \"Count\",\n\t\"Contribution\": {\n\t\t\"Filters\": [],\n\t\t\"Keys\": [\n\t\t\t\"$.requestId\"\n\t\t]\n\t},\n\t\"LogFormat\": \"JSON\",\n\t\"Schema\": {\n\t\t\"Name\": \"CloudWatchLogRule\",\n\t\t\"Version\": 1\n\t},\n\t\"LogGroupARNs\": [\n\t\t\"arn:aws:logs:us-east-1:123456789012:log-group:demo-1\"\n\t]\n}",
                "ManagedRule": false
            }
        ]
    }

For more information, see `Use Contributor Insights to analyze high-cardinality data <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/ContributorInsights.html>`__ in the *Amazon CloudWatch User Guide*.