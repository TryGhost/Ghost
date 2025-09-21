**To create a performance analysis report**

The following ``create-performance-analysis-report`` example creates a performance analysis report with the start time ``1682969503`` and end time ``1682979503`` for the database ``db-abcdefg123456789``. ::

    aws pi create-performance-analysis-report \
        --service-type RDS \
        --identifier db-abcdefg123456789 \
        --start-time 1682969503 \
        --end-time 1682979503

Output::

    {
        "AnalysisReportId": "report-0234d3ed98e28fb17"
    }

For more information about creating performance analysis reports, see `Creating a performance analysis report in Performance Insights <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.UsingDashboard.CreatingPerfAnlysisReport.html>`__ in the *Amazon RDS User Guide* and `Creating a performance analysis report in Performance Insights <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_PerfInsights.UsingDashboard.CreatingPerfAnlysisReport.html>`__ in the *Amazon Aurora User Guide*.