**To get network performance data**

The following ``get-aws-network-performance-data`` example retrieves data about the network performance between the specified Regions in the specified time period. ::

    aws ec2 get-aws-network-performance-data \
        --start-time 2022-10-26T12:00:00.000Z \
        --end-time 2022-10-26T12:30:00.000Z \
        --data-queries Id=my-query,Source=us-east-1,Destination=eu-west-1,Metric=aggregate-latency,Statistic=p50,Period=five-minutes

Output::

    {
        "DataResponses": [
            {
                "Id": "my-query",
                "Source": "us-east-1",
                "Destination": "eu-west-1",
                "Metric": "aggregate-latency",
                "Statistic": "p50",
                "Period": "five-minutes",
                "MetricPoints": [
                    {
                        "StartDate": "2022-10-26T12:00:00+00:00",
                        "EndDate": "2022-10-26T12:05:00+00:00",
                        "Value": 62.44349,
                        "Status": "OK"
                    },
                    {
                        "StartDate": "2022-10-26T12:05:00+00:00",
                        "EndDate": "2022-10-26T12:10:00+00:00",
                        "Value": 62.483498,
                        "Status": "OK"
                    },
                    {
                        "StartDate": "2022-10-26T12:10:00+00:00",
                        "EndDate": "2022-10-26T12:15:00+00:00",
                        "Value": 62.51248,
                        "Status": "OK"
                    },
                    {
                        "StartDate": "2022-10-26T12:15:00+00:00",
                        "EndDate": "2022-10-26T12:20:00+00:00",
                        "Value": 62.635475,
                        "Status": "OK"
                    },
                    {
                        "StartDate": "2022-10-26T12:20:00+00:00",
                        "EndDate": "2022-10-26T12:25:00+00:00",
                        "Value": 62.733974,
                        "Status": "OK"
                    },
                    {
                        "StartDate": "2022-10-26T12:25:00+00:00",
                        "EndDate": "2022-10-26T12:30:00+00:00",
                        "Value": 62.773975,
                        "Status": "OK"
                    },
                    {
                        "StartDate": "2022-10-26T12:30:00+00:00",
                        "EndDate": "2022-10-26T12:35:00+00:00",
                        "Value": 62.75349,
                        "Status": "OK"
                    }
                ] 
            }
        ]
    }

For more information, see `Monitor network performance <https://docs.aws.amazon.com/network-manager/latest/infrastructure-performance/nmip-performance-cli.html>`__ in the *Infrastructure Performance User Guide*.
