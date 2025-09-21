**To create a new environment for an application**

The following command creates a new environment for version "v1" of a java application named "my-app"::

  aws elasticbeanstalk create-environment --application-name my-app --environment-name my-env --cname-prefix my-app --version-label v1 --solution-stack-name "64bit Amazon Linux 2015.03 v2.0.0 running Tomcat 8 Java 8"

Output::

  {
    "ApplicationName": "my-app",
    "EnvironmentName": "my-env",
    "VersionLabel": "v1",
    "Status": "Launching",
    "EnvironmentId": "e-izqpassy4h",
    "SolutionStackName": "64bit Amazon Linux 2015.03 v2.0.0 running Tomcat 8 Java 8",
    "CNAME": "my-app.elasticbeanstalk.com",
    "Health": "Grey",
    "Tier": {
        "Type": "Standard",
        "Name": "WebServer",
        "Version": " "
    },
    "DateUpdated": "2015-02-03T23:04:54.479Z",
    "DateCreated": "2015-02-03T23:04:54.479Z"
  }

``v1`` is the label of an application version previously uploaded with `create-application-version`_.

.. _`create-application-version`: http://docs.aws.amazon.com/cli/latest/reference/elasticbeanstalk/create-application-version.html

**To specify a JSON file to define environment configuration options**

The following ``create-environment`` command specifies that a JSON file with the name ``myoptions.json`` should be used to override values obtained from the solution stack or the configuration template::

  aws elasticbeanstalk create-environment --environment-name sample-env --application-name sampleapp --option-settings file://myoptions.json

``myoptions.json`` is a JSON object defining several settings::

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

For more information, see `Option Values`_ in the *AWS Elastic Beanstalk Developer Guide*.

.. _`Option Values`: http://docs.aws.amazon.com/elasticbeanstalk/latest/dg/command-options.html
