**To view information about an environment**

The following command retrieves information about an environment named ``my-env``::

  aws elasticbeanstalk describe-environments --environment-names my-env

Output::

  {
      "Environments": [
          {
              "ApplicationName": "my-app",
              "EnvironmentName": "my-env",
              "VersionLabel": "7f58-stage-150812_025409",
              "Status": "Ready",
              "EnvironmentId": "e-rpqsewtp2j",
              "EndpointURL": "awseb-e-w-AWSEBLoa-1483140XB0Q4L-109QXY8121.us-west-2.elb.amazonaws.com",
              "SolutionStackName": "64bit Amazon Linux 2015.03 v2.0.0 running Tomcat 8 Java 8",
              "CNAME": "my-env.elasticbeanstalk.com",
              "Health": "Green",
              "AbortableOperationInProgress": false,
              "Tier": {
                  "Version": " ",
                  "Type": "Standard",
                  "Name": "WebServer"
              },
              "DateUpdated": "2015-08-12T18:16:55.019Z",
              "DateCreated": "2015-08-07T20:48:49.599Z"
          }
      ]
  }
