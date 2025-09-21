**To terminate an environment**

The following command terminates an Elastic Beanstalk environment named ``my-env``::

  aws elasticbeanstalk terminate-environment --environment-name my-env

Output::

  {
      "ApplicationName": "my-app",
      "EnvironmentName": "my-env",
      "Status": "Terminating",
      "EnvironmentId": "e-fh2eravpns",
      "EndpointURL": "awseb-e-f-AWSEBLoa-1I9XUMP4-8492WNUP202574.us-west-2.elb.amazonaws.com",
      "SolutionStackName": "64bit Amazon Linux 2015.03 v2.0.0 running Tomcat 8 Java 8",
      "CNAME": "my-env.elasticbeanstalk.com",
      "Health": "Grey",
      "AbortableOperationInProgress": false,
      "Tier": {
          "Version": " ",
          "Type": "Standard",
          "Name": "WebServer"
      },
      "DateUpdated": "2015-08-12T19:05:54.744Z",
      "DateCreated": "2015-08-12T18:52:53.622Z"
  }
