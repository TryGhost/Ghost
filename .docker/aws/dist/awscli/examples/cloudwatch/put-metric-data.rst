**To publish a custom metric to Amazon CloudWatch**

The following example uses the ``put-metric-data`` command to publish a custom metric to Amazon CloudWatch::

  aws cloudwatch put-metric-data --namespace "Usage Metrics" --metric-data file://metric.json

The values for the metric itself are stored in the JSON file, ``metric.json``.

Here are the contents of that file::

  [
    {
      "MetricName": "New Posts",
      "Timestamp": "Wednesday, June 12, 2013 8:28:20 PM",
      "Value": 0.50,
      "Unit": "Count"
    }
  ]

For more information, see `Publishing Custom Metrics`_ in the *Amazon CloudWatch Developer Guide*.

.. _`Publishing Custom Metrics`: http://docs.aws.amazon.com/AmazonCloudWatch/latest/DeveloperGuide/publishingMetrics.html

**To specify multiple dimensions**

The following example illustrates how to specify multiple dimensions. Each dimension is specified as a Name=Value pair. Multiple dimensions are separated by a comma.::

  aws cloudwatch put-metric-data --metric-name Buffers --namespace MyNameSpace --unit Bytes --value 231434333 --dimensions InstanceID=1-23456789,InstanceType=m1.small
