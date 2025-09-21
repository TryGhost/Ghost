**To add a tag to a performance analysis report**

The following ``tag-resource`` example adds the tag key ``name`` with the tag value ``test-tag`` to a performance analysis report with the report ID ``report-0d99cc91c4422ee61``. ::

    aws pi tag-resource \
        --service-type RDS \
        --resource-arn arn:aws:pi:us-west-2:123456789012:perf-reports/RDS/db-abcdefg123456789/report-0d99cc91c4422ee61 \
        --tags Key=name,Value=test-tag

This command produces no output.

For more information about tagging performance analysis reports, see `Adding tags to a performance analysis report in Performance Insights <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.UsingDashboard.ManagePerfAnalysisReportTags.html>`__ in the *Amazon RDS User Guide* and `Adding tags to a performance analysis report in Performance Insights <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_PerfInsights.UsingDashboard.ManagePerfAnalysisReportTags.html>`__ in the *Amazon Aurora User Guide*.