**To view environment health**

The following command retrieves health information for instances in an environment named ``my-env``::

  aws elasticbeanstalk describe-instances-health --environment-name my-env --attribute-names All

Output::

  {
      "InstanceHealthList": [
          {
              "InstanceId": "i-08691cc7",
              "ApplicationMetrics": {
                  "Duration": 10,
                  "Latency": {
                      "P99": 0.006,
                      "P75": 0.002,
                      "P90": 0.004,
                      "P95": 0.005,
                      "P85": 0.003,
                      "P10": 0.0,
                      "P999": 0.006,
                      "P50": 0.001
                  },
                  "RequestCount": 48,
                  "StatusCodes": {
                      "Status3xx": 0,
                      "Status2xx": 47,
                      "Status5xx": 0,
                      "Status4xx": 1
                  }
              },
              "System": {
                  "LoadAverage": [
                      0.0,
                      0.02,
                      0.05
                  ],
                  "CPUUtilization": {
                      "SoftIRQ": 0.1,
                      "IOWait": 0.2,
                      "System": 0.3,
                      "Idle": 97.8,
                      "User": 1.5,
                      "IRQ": 0.0,
                      "Nice": 0.1
                  }
              },
              "Color": "Green",
              "HealthStatus": "Ok",
              "LaunchedAt": "2015-08-13T19:17:09Z",
              "Causes": []
          }
      ],
      "RefreshedAt": "2015-08-20T21:09:08Z"
  }

Health information is only available for environments with enhanced health reporting enabled. For more information, see `Enhanced Health Reporting and Monitoring`_ in the *AWS Elastic Beanstalk Developer Guide*.

.. _`Enhanced Health Reporting and Monitoring`: http://integ-docs-aws.amazon.com/elasticbeanstalk/latest/dg/health-enhanced.html
