**To get a service graph**

The following example displays a document within a specified time period that describes services processing incoming requests, and the downstream services that they call as a result.::

    aws xray get-service-graph \
        --start-time 1568835392.0 
        --end-time 1568835446.0

Output::

    {
        "Services": [
            {
                "ReferenceId": 0,
                "Name": "Scorekeep",
                "Names": [
                    "Scorekeep"
                ],
                "Root": true,
                "Type": "AWS::ElasticBeanstalk::Environment",
                "State": "active",
                "StartTime": 1568835392.0,
                "EndTime": 1568835446.0,
                "Edges": [
                    {
                        "ReferenceId": 1,
                        "StartTime": 1568835392.0,
                        "EndTime": 1568835446.0,
                        "SummaryStatistics": {
                            "OkCount": 14,
                            "ErrorStatistics": {
                                "ThrottleCount": 0,
                                "OtherCount": 0,
                                "TotalCount": 0
                            },
                            "FaultStatistics": {
                                "OtherCount": 0,
                                "TotalCount": 0
                            },
                            "TotalCount": 14,
                            "TotalResponseTime": 0.13
                        },
                        "ResponseTimeHistogram": [
                            {
                                "Value": 0.008,
                                "Count": 1
                            },
                            {
                                "Value": 0.005,
                                "Count": 7
                            },
                            {
                                "Value": 0.009,
                                "Count": 1
                            },
                            {
                                "Value": 0.021,
                                "Count": 1
                            },
                            {
                                "Value": 0.038,
                                "Count": 1
                            },
                            {
                                "Value": 0.007,
                                "Count": 1
                            },
                            {
                                "Value": 0.006,
                                "Count": 2
                            }
                        ],
                        "Aliases": []
                    },
                    
                    ... TRUNCATED FOR BREVITY ...
                    
                ]
            }
        ],
        "StartTime": 1568835392.0,
        "EndTime": 1568835446.0,
        "ContainsOldGroupVersions": false
    }

For more information, see `Using the AWS X-Ray API with the AWS CLI <https://docs.aws.amazon.com/xray/latest/devguide/xray-api-tutorial.html>`__ in the *AWS X-Ray Developer Guide*.
