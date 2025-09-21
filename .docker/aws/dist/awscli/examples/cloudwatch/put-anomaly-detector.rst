**To create an anomaly detection model**

The following ``put-anomaly-detector`` example creates an anomaly detection model for a CloudWatch metric. ::

    aws cloudwatch put-anomaly-detector \
        --namespace AWS/Logs \
        --metric-name IncomingBytes \
        --stat SampleCount

This command produces no output.

For more information, see `Using CloudWatch anomaly detection <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Anomaly_Detection.html>`__ in the *Amazon CloudWatch User Guide*.