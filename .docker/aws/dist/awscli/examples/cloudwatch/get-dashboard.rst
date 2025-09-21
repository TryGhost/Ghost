**To retrieve information about a Dashboard**

The following ``get-dashboard`` example displays information about the dashboard named ``Dashboard-A`` in the specified account. ::

    aws cloudwatch get-dashboard \
        --dashboard-name Dashboard-A 

Output::

    {
        "DashboardArn": "arn:aws:cloudwatch::123456789012:dashboard/Dashboard-A",
        "DashboardBody": "{\"widgets\":[{\"type\":\"metric\",\"x\":0,\"y\":0,\"width\":6,\"height\":6,\"properties\":{\"view\":\"timeSeries\",\"stacked\":false,\"metrics\":[[\"AWS/EC2\",\"NetworkIn\",\"InstanceId\",\"i-0131f062232ade043\"],[\".\",\"NetworkOut\",\".\",\".\"]],\"region\":\"us-east-1\"}}]}",
        "DashboardName": "Dashboard-A"
    }

For more information, see `Amazon CloudWatch dashboards <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Dashboards.html>`__ in the *Amazon CloudWatch User Guide*.