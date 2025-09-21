**To delete a tag for a performance analysis report**

The following ``untag-resource`` example deletes the tag ``name`` for a performance analysis report with the report ID ``report-0d99cc91c4422ee61``. ::

    aws pi untag-resource \
        --service-type RDS \
        --resource-arn arn:aws:pi:us-west-2:123456789012:perf-reports/RDS/db-abcdefg123456789/report-0d99cc91c4422ee61 \
        --tag-keys name

This command produces no output.

For more information about tagging performance analysis reports, see `Adding tags to a performance analysis report in Performance Insights <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.UsingDashboard.ManagePerfAnalysisReportTags.html>`__ in the *Amazon RDS User Guide* and `Adding tags to a performance analysis report in Performance Insights <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_PerfInsights.UsingDashboard.ManagePerfAnalysisReportTags.html>`__ in the *Amazon Aurora User Guide*.