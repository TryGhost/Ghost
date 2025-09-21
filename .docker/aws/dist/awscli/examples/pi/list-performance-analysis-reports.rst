**To list performance analysis reports for a database**

The following ``list-performance-analysis-reports`` example lists performance analysis reports for the database ``db-abcdefg123456789``. The response lists all the reports with the report ID, status, and time period details. ::

    aws pi list-performance-analysis-reports \
        --service-type RDS \
        --identifier db-abcdefg123456789

Output::

    {
        "AnalysisReports": [
            {
                "Status": "Succeeded",
                "EndTime": 1680587086.584,
                "CreateTime": 1680587087.139,
                "StartTime": 1680583486.584,
                "AnalysisReportId": "report-0d99cc91c4422ee61"
            },
            {
                "Status": "Succeeded",
                "EndTime": 1681491137.914,
                "CreateTime": 1681491145.973,
                "StartTime": 1681487537.914,
                "AnalysisReportId": "report-002633115cc002233"
            },
            {
                "Status": "Succeeded",
                "EndTime": 1681493499.849,
                "CreateTime": 1681493507.762,
                "StartTime": 1681489899.849,
                "AnalysisReportId": "report-043b1e006b47246f9"
            },
            {
                "Status": "InProgress",
                "EndTime": 1682979503.0,
                "CreateTime": 1682979618.994,
                "StartTime": 1682969503.0,
                "AnalysisReportId": "report-01ad15f9b88bcbd56"
            }
        ]
    }

For more information about performance analysis reports, see `Analyzing database performance for a period of time <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.UsingDashboard.AnalyzePerformanceTimePeriod.html>`__ in the *Amazon RDS User Guide* and `Analyzing database performance for a period of time <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_PerfInsights.UsingDashboard.AnalyzePerformanceTimePeriod.html>`__ in the *Amazon Aurora User Guide*.