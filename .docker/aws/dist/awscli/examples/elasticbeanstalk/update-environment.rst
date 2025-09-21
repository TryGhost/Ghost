**To update an environment to a new version**

The following command updates an environment named "my-env" to version "v2" of the application to which it belongs::

  aws elasticbeanstalk update-environment --environment-name my-env --version-label v2

This command requires that the "my-env" environment already exists and belongs to an application that has a valid application version with the label "v2".

Output::

  {
    "ApplicationName": "my-app",
    "EnvironmentName": "my-env",
    "VersionLabel": "v2",
    "Status": "Updating",
    "EnvironmentId": "e-szqipays4h",
    "EndpointURL": "awseb-e-i-AWSEBLoa-1RDLX6TC9VUAO-0123456789.us-west-2.elb.amazonaws.com",
    "SolutionStackName": "64bit Amazon Linux running Tomcat 7",
    "CNAME": "my-env.elasticbeanstalk.com",
    "Health": "Grey",
    "Tier": {
        "Version": " ",
        "Type": "Standard",
        "Name": "WebServer"
    },
    "DateUpdated": "2015-02-03T23:12:29.119Z",
    "DateCreated": "2015-02-03T23:04:54.453Z"
  }

**To set an environment variable**

The following command sets the value of the "PARAM1" variable in the "my-env" environment to "ParamValue"::

  aws elasticbeanstalk update-environment --environment-name my-env --option-settings Namespace=aws:elasticbeanstalk:application:environment,OptionName=PARAM1,Value=ParamValue

The ``option-settings`` parameter takes a namespace in addition to the name and value of the variable. Elastic Beanstalk supports several namespaces for options in addition to environment variables.

**To configure option settings from a file**

The following command configures several options in the ``aws:elb:loadbalancer`` namespace from a file::

  aws elasticbeanstalk update-environment --environment-name my-env --option-settings file://options.json

``options.json`` is a JSON object defining several settings::

  [
    {
      "Namespace": "aws:elb:healthcheck",
      "OptionName": "Interval",
      "Value": "15"
    },
    {
      "Namespace": "aws:elb:healthcheck",
      "OptionName": "Timeout",
      "Value": "8"
    },
    {
      "Namespace": "aws:elb:healthcheck",
      "OptionName": "HealthyThreshold",
      "Value": "2"
    },
    {
      "Namespace": "aws:elb:healthcheck",
      "OptionName": "UnhealthyThreshold",
      "Value": "3"
    }
  ]

Output::

  {
      "ApplicationName": "my-app",
      "EnvironmentName": "my-env",
      "VersionLabel": "7f58-stage-150812_025409",
      "Status": "Updating",
      "EnvironmentId": "e-wtp2rpqsej",
      "EndpointURL": "awseb-e-w-AWSEBLoa-14XB83101Q4L-104QXY80921.sa-east-1.elb.amazonaws.com",
      "SolutionStackName": "64bit Amazon Linux 2015.03 v2.0.0 running Tomcat 8 Java 8",
      "CNAME": "my-env.elasticbeanstalk.com",
      "Health": "Grey",
      "AbortableOperationInProgress": true,
      "Tier": {
          "Version": " ",
          "Type": "Standard",
          "Name": "WebServer"
      },
      "DateUpdated": "2015-08-12T18:15:23.804Z",
      "DateCreated": "2015-08-07T20:48:49.599Z"
  }

For more information about namespaces and supported options, see `Option Values`_ in the *AWS Elastic Beanstalk Developer Guide*.

.. _`Option Values`: http://docs.aws.amazon.com/elasticbeanstalk/latest/dg/command-options.html
