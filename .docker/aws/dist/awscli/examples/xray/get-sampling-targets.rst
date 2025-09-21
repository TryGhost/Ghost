**To request a sampling quota**

The following ``get-sampling-targets`` example requests a sampling quota for rules that the service is using to sample requests. The response from AWS X-Ray includes a quota that can be used instead of borrowing from the reservoir. ::

    aws xray get-sampling-targets \
        --sampling-statistics-documents '[ { "RuleName": "base-scorekeep", "ClientID": "ABCDEF1234567890ABCDEF10", "Timestamp": "2018-07-07T00:20:06, "RequestCount": 110, "SampledCount": 20, "BorrowCount": 10 }, { "RuleName": "polling-scorekeep", 31, "BorrowCount": 0 } ]'

Output::

    {
        "SamplingTargetDocuments": [
            {
                "RuleName": "base-scorekeep",
                "FixedRate": 0.1,
                "ReservoirQuota": 2,
                "ReservoirQuotaTTL": 1530923107.0,
                "Interval": 10
            },
            {
                "RuleName": "polling-scorekeep",
                "FixedRate": 0.003,
                "ReservoirQuota": 0,
                "ReservoirQuotaTTL": 1530923107.0,
                "Interval": 10
            }
        ],
        "LastRuleModification": 1530920505.0,
        "UnprocessedStatistics": []
    }

For more information, see `Using Sampling Rules with the X-Ray API <https://docs.aws.amazon.com/en_pv/xray/latest/devguide/xray-api-sampling.html>`__ in the *AWS X-Ray Developer Guide*.
