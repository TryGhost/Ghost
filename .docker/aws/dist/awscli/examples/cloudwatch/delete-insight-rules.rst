**To delete specified contributor insights rules**

The following ``delete-insight-rules`` example deletes two contributor insights rules named ``Rule-A`` and ``Rule-B`` in the specified account. ::

    aws cloudwatch delete-insight-rules \
        --rule-names Rule-A Rule-B 

Output::

    {
        "Failures": []
    }

For more information, see `Use Contributor Insights to analyze high-cardinality data <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/ContributorInsights.html>`__ in the *Amazon CloudWatch User Guide*.