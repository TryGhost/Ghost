**To retrieve a list of Dashboards**

The following ``list-dashboards`` example lists all the Dashboards in the specified account. ::

    aws cloudwatch list-dashboards 

Output::

    {
        "DashboardEntries": [
            {
                "DashboardName": "Dashboard-A",
                "DashboardArn": "arn:aws:cloudwatch::123456789012:dashboard/Dashboard-A",
                "LastModified": "2024-10-11T18:40:11+00:00",
                "Size": 271
            },
            {
                "DashboardName": "Dashboard-B",
                "DashboardArn": "arn:aws:cloudwatch::123456789012:dashboard/Dashboard-B",
                "LastModified": "2024-10-11T18:44:41+00:00",
                "Size": 522
            }
        ]
    }
    
For more information, see `Amazon CloudWatch dashboards <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Dashboards.html>`__ in the *Amazon CloudWatch User Guide*.