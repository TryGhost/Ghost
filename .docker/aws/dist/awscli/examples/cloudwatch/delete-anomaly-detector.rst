**To delete a specified anomaly detection model**

The following ``delete-anomaly-detector`` example deletes an anomaly detector model in the specified account. ::

    aws cloudwatch delete-anomaly-detector \
        --namespace AWS/Logs \
        --metric-name IncomingBytes \
        --stat SampleCount 

This command produces no output.

For more information, see `Deleting an anomaly detection model <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Create_Anomaly_Detection_Alarm.html#Delete_Anomaly_Detection_Model>`__ in the *Amazon CloudWatch User Guide*.