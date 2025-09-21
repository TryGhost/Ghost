**To delete specified dashboards**

The following ``delete-dashboards`` example deletes two dashboards named ``Dashboard-A`` and ``Dashboard-B`` in the specified account. ::

    aws cloudwatch delete-dashboards \
        --dashboard-names Dashboard-A Dashboard-B

This command produces no output.

For more information, see `Amazon CloudWatch dashboards <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Dashboards.html>`__ in the *Amazon CloudWatch User Guide*.