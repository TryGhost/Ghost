**To get a performance analysis report**

The following ``get-performance-analysis-report`` example gets the performance analysis report for the database ``db-abcdefg123456789`` with the report ID ``report-0d99cc91c4422ee61``. The response provides the report status, ID, time details, and insights. ::

    aws pi get-performance-analysis-report \
        --service-type RDS \
        --identifier db-abcdefg123456789 \
        --analysis-report-id report-0d99cc91c4422ee61

Output::

    {
        "AnalysisReport": {
            "Status": "Succeeded",
            "ServiceType": "RDS",
            "Identifier": "db-abcdefg123456789",
            "StartTime": 1680583486.584,
            "AnalysisReportId": "report-0d99cc91c4422ee61",
            "EndTime": 1680587086.584,
            "CreateTime": 1680587087.139,
            "Insights": [
                ... (Condensed for space)
           ]
        }
    }

For more information about performance analysis reports, see `Analyzing database performance for a period of time <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.UsingDashboard.AnalyzePerformanceTimePeriod.html>`__ in the *Amazon RDS User Guide* and `Analyzing database performance for a period of time <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_PerfInsights.UsingDashboard.AnalyzePerformanceTimePeriod.html>`__ in the *Amazon Aurora User Guide*.