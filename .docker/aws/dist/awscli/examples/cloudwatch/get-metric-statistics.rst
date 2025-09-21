**To get the CPU utilization per EC2 instance**

The following example uses the ``get-metric-statistics`` command to get the CPU utilization for an EC2
instance with the ID i-abcdef. 

.. __: http://docs.aws.amazon.com/AmazonCloudWatch/latest/DeveloperGuide/US_GetStatistics.html

::

  aws cloudwatch get-metric-statistics --metric-name CPUUtilization --start-time 2014-04-08T23:18:00Z --end-time 2014-04-09T23:18:00Z --period 3600 --namespace AWS/EC2 --statistics Maximum --dimensions Name=InstanceId,Value=i-abcdef

Output::

    {
        "Datapoints": [
            {
                "Timestamp": "2014-04-09T11:18:00Z",
                "Maximum": 44.79,
                "Unit": "Percent"
            },
            {
                "Timestamp": "2014-04-09T20:18:00Z",
                "Maximum": 47.92,
                "Unit": "Percent"
            },
            {
                "Timestamp": "2014-04-09T19:18:00Z",
                "Maximum": 50.85,
                "Unit": "Percent"
            },
            {
                "Timestamp": "2014-04-09T09:18:00Z",
                "Maximum": 47.92,
                "Unit": "Percent"
            },
            {
                "Timestamp": "2014-04-09T03:18:00Z",
                "Maximum": 76.84,
                "Unit": "Percent"
            },
            {
                "Timestamp": "2014-04-09T21:18:00Z",
                "Maximum": 48.96,
                "Unit": "Percent"
            },
            {
                "Timestamp": "2014-04-09T14:18:00Z",
                "Maximum": 47.92,
                "Unit": "Percent"
            },
            {
                "Timestamp": "2014-04-09T08:18:00Z",
                "Maximum": 47.92,
                "Unit": "Percent"
            },
            {
                "Timestamp": "2014-04-09T16:18:00Z",
                "Maximum": 45.55,
                "Unit": "Percent"
            },
            {
                "Timestamp": "2014-04-09T06:18:00Z",
                "Maximum": 47.92,
                "Unit": "Percent"
            },
            {
                "Timestamp": "2014-04-09T13:18:00Z",
                "Maximum": 45.08,
                "Unit": "Percent"
            },
            {
                "Timestamp": "2014-04-09T05:18:00Z",
                "Maximum": 47.92,
                "Unit": "Percent"
            },
            {
                "Timestamp": "2014-04-09T18:18:00Z",
                "Maximum": 46.88,
                "Unit": "Percent"
            },
            {
                "Timestamp": "2014-04-09T17:18:00Z",
                "Maximum": 52.08,
                "Unit": "Percent"
            },
            {
                "Timestamp": "2014-04-09T07:18:00Z",
                "Maximum": 47.92,
                "Unit": "Percent"
            },
            {
                "Timestamp": "2014-04-09T02:18:00Z",
                "Maximum": 51.23,
                "Unit": "Percent"
            },
            {
                "Timestamp": "2014-04-09T12:18:00Z",
                "Maximum": 47.67,
                "Unit": "Percent"
            },
            {
                "Timestamp": "2014-04-08T23:18:00Z",
                "Maximum": 46.88,
                "Unit": "Percent"
            },
            {
                "Timestamp": "2014-04-09T10:18:00Z",
                "Maximum": 51.91,
                "Unit": "Percent"
            },
            {
                "Timestamp": "2014-04-09T04:18:00Z",
                "Maximum": 47.13,
                "Unit": "Percent"
            },
            {
                "Timestamp": "2014-04-09T15:18:00Z",
                "Maximum": 48.96,
                "Unit": "Percent"
            },
            {
                "Timestamp": "2014-04-09T00:18:00Z",
                "Maximum": 48.16,
                "Unit": "Percent"
            },
            {
                "Timestamp": "2014-04-09T01:18:00Z",
                "Maximum": 49.18,
                "Unit": "Percent"
            }
        ],
        "Label": "CPUUtilization"
    }

**Specifying multiple dimensions**

The following example illustrates how to specify multiple dimensions. Each dimension is specified as a Name/Value pair, with a comma between the name and the value. Multiple dimensions are separated by a space. If a single metric includes multiple dimensions, you must specify a value for every defined dimension.

For more examples using the ``get-metric-statistics`` command, see `Get Statistics for a Metric`__ in the *Amazon CloudWatch Developer Guide*.

.. __: http://docs.aws.amazon.com/AmazonCloudWatch/latest/DeveloperGuide/US_GetStatistics.html

::

  aws cloudwatch get-metric-statistics --metric-name Buffers --namespace MyNameSpace --dimensions Name=InstanceID,Value=i-abcdef Name=InstanceType,Value=m1.small --start-time 2016-10-15T04:00:00Z --end-time 2016-10-19T07:00:00Z --statistics Average --period 60
