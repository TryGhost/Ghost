**To delete a performance analysis report**

The following ``delete-performance-analysis-report`` example deletes the performance analysis report with the report ID ``report-0d99cc91c4422ee61``. ::

    aws pi delete-performance-analysis-report \
        --service-type RDS \
        --identifier db-abcdefg123456789 \
        --analysis-report-id report-0d99cc91c4422ee61

This command produces no output.

For more information about deleting performance analysis reports, see `Deleting a performance analysis report in Performance Insights <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.UsingDashboard.DeletePerfAnalysisReport.html>`__ in the *Amazon RDS User Guide* and `Deleting a performance analysis report in Performance Insights <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_PerfInsights.UsingDashboard.DeletePerfAnalysisReport.html>`__ in the *Amazon Aurora User Guide*.