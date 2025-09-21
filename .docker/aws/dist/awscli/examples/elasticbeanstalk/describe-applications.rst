**To view a list of applications**

The following command retrieves information about applications in the current region::

  aws elasticbeanstalk describe-applications

Output::

  {
      "Applications": [
          {
              "ApplicationName": "ruby",
              "ConfigurationTemplates": [],
              "DateUpdated": "2015-08-13T21:05:44.376Z",
              "Versions": [
                  "Sample Application"
              ],
              "DateCreated": "2015-08-13T21:05:44.376Z"
          },
          {
              "ApplicationName": "pythonsample",
              "Description": "Application created from the EB CLI using \"eb init\"",
              "Versions": [
                  "Sample Application"
              ],
              "DateCreated": "2015-08-13T19:05:43.637Z",
              "ConfigurationTemplates": [],
              "DateUpdated": "2015-08-13T19:05:43.637Z"
          },
          {
              "ApplicationName": "nodejs-example",
              "ConfigurationTemplates": [],
              "DateUpdated": "2015-08-06T17:50:02.486Z",
              "Versions": [
                  "add elasticache",
                  "First Release"
              ],
              "DateCreated": "2015-08-06T17:50:02.486Z"
          }
      ]
  }
