**To list information about an AWS Health event**

The following ``describe-event-details`` example lists information about the specified AWS Health event. ::

    aws health describe-event-details \
        --event-arns "arn:aws:health:us-east-1::event/EC2/AWS_EC2_OPERATIONAL_ISSUE/AWS_EC2_OPERATIONAL_ISSUE_VKTXI_EXAMPLE111" \
        --region us-east-1

Output::

    {
        "successfulSet": [
            {
                "event": {
                    "arn": "arn:aws:health:us-east-1::event/EC2/AWS_EC2_OPERATIONAL_ISSUE/AWS_EC2_OPERATIONAL_ISSUE_VKTXI_EXAMPLE111",
                    "service": "EC2",
                    "eventTypeCode": "AWS_EC2_OPERATIONAL_ISSUE",
                    "eventTypeCategory": "issue",
                    "region": "us-east-1",
                    "startTime": 1587462325.096,
                    "endTime": 1587464204.774,
                    "lastUpdatedTime": 1587464204.865,
                    "statusCode": "closed"
                },
                "eventDescription": {
                    "latestDescription": "[RESOLVED] Increased API Error Rates and Latencies\n\n[02:45 AM PDT] We are investigating increased API error rates and latencies in the US-EAST-1 Region.\n\n[03:16 AM PDT] Between 2:10 AM and 2:59 AM PDT we experienced increased API error rates and latencies in the US-EAST-1 Region. The issue has been resolved and the service is operating normally."
                }
            }
        ],
        "failedSet": []
    }

For more information, see `Event details pane <https://docs.aws.amazon.com/health/latest/ug/getting-started-phd.html#event-details>`__ in the *AWS Health User Guide*.