**To view events for an environment**

The following command retrieves events for an environment named ``my-env``::

  aws elasticbeanstalk describe-events --environment-name my-env

Output (abbreviated)::

  {
      "Events": [
          {
              "ApplicationName": "my-app",
              "EnvironmentName": "my-env",
              "Message": "Environment health has transitioned from Info to Ok.",
              "EventDate": "2015-08-20T07:06:53.535Z",
              "Severity": "INFO"
          },
          {
              "ApplicationName": "my-app",
              "EnvironmentName": "my-env",
              "Severity": "INFO",
              "RequestId": "b7f3960b-4709-11e5-ba1e-07e16200da41",
              "Message": "Environment update completed successfully.",
              "EventDate": "2015-08-20T07:06:02.049Z"
          },
          ...
          {
              "ApplicationName": "my-app",
              "EnvironmentName": "my-env",
              "Severity": "INFO",
              "RequestId": "ca8dfbf6-41ef-11e5-988b-651aa638f46b",
              "Message": "Using elasticbeanstalk-us-west-2-012445113685 as Amazon S3 storage bucket for environment data.",
              "EventDate": "2015-08-13T19:16:27.561Z"
          },
          {
              "ApplicationName": "my-app",
              "EnvironmentName": "my-env",
              "Severity": "INFO",
              "RequestId": "cdfba8f6-41ef-11e5-988b-65638f41aa6b",
              "Message": "createEnvironment is starting.",
              "EventDate": "2015-08-13T19:16:26.581Z"
          }
      ]
  }
