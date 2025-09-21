**To view environment health**

The following command retrieves overall health information for an environment named ``my-env``::

  aws elasticbeanstalk describe-environment-health --environment-name my-env --attribute-names All

Output::

  {
      "Status": "Ready",
      "EnvironmentName": "my-env",
      "Color": "Green",
      "ApplicationMetrics": {
          "Duration": 10,
          "Latency": {
              "P99": 0.004,
              "P75": 0.002,
              "P90": 0.003,
              "P95": 0.004,
              "P85": 0.003,
              "P10": 0.001,
              "P999": 0.004,
              "P50": 0.001
          },
          "RequestCount": 45,
          "StatusCodes": {
              "Status3xx": 0,
              "Status2xx": 45,
              "Status5xx": 0,
              "Status4xx": 0
          }
      },
      "RefreshedAt": "2015-08-20T21:09:18Z",
      "HealthStatus": "Ok",
      "InstancesHealth": {
          "Info": 0,
          "Ok": 1,
          "Unknown": 0,
          "Severe": 0,
          "Warning": 0,
          "Degraded": 0,
          "NoData": 0,
          "Pending": 0
      },
      "Causes": []
  }

Health information is only available for environments with enhanced health reporting enabled. For more information, see `Enhanced Health Reporting and Monitoring`_ in the *AWS Elastic Beanstalk Developer Guide*.

.. _`Enhanced Health Reporting and Monitoring`: http://integ-docs-aws.amazon.com/elasticbeanstalk/latest/dg/health-enhanced.html
