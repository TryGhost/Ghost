**To retrieve a snapshot graph of CPUUtilization**

The following ``get-metric-widget-image`` example retrieves snapshot graph for the metric ``CPUUtilization`` of the EC2 instance with the ID ``i-abcde`` and saves the retrieved image as a file named "image.png" on your local machine. ::

    aws cloudwatch get-metric-widget-image \
        --metric-widget '{"metrics":[["AWS/EC2","CPUUtilization","InstanceId","i-abcde"]]}' \
        --output-format png \
        --output text | base64 --decode > image.png

This command produces no output.
