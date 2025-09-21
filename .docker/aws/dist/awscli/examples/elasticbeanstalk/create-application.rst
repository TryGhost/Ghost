**To create a new application**

The following command creates a new application named "MyApp"::

  aws elasticbeanstalk create-application --application-name MyApp --description "my application"

The ``create-application`` command only configures the application's name and description. To upload source code for the application, create an initial version of the application using ``create-application-version``. ``create-application-version`` also has an ``auto-create-application`` option that lets you create the application and the application version in one step.

Output::

  {
    "Application": {
        "ApplicationName": "MyApp",
        "ConfigurationTemplates": [],
        "DateUpdated": "2015-02-12T18:32:21.181Z",
        "Description": "my application",
        "DateCreated": "2015-02-12T18:32:21.181Z"
    }
  }
