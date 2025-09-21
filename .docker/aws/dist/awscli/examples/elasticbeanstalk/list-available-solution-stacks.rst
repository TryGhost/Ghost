**To view solution stacks**

The following command lists solution stacks for all currently available platform configurations and any that you have used in the past::

  aws elasticbeanstalk list-available-solution-stacks

Output (abbreviated)::

  {
      "SolutionStacks": [
          "64bit Amazon Linux 2015.03 v2.0.0 running Node.js",
          "64bit Amazon Linux 2015.03 v2.0.0 running PHP 5.6",
          "64bit Amazon Linux 2015.03 v2.0.0 running PHP 5.5",
          "64bit Amazon Linux 2015.03 v2.0.0 running PHP 5.4",
          "64bit Amazon Linux 2015.03 v2.0.0 running Python 3.4",
          "64bit Amazon Linux 2015.03 v2.0.0 running Python 2.7",
          "64bit Amazon Linux 2015.03 v2.0.0 running Python",
          "64bit Amazon Linux 2015.03 v2.0.0 running Ruby 2.2 (Puma)",
          "64bit Amazon Linux 2015.03 v2.0.0 running Ruby 2.2 (Passenger Standalone)",
          "64bit Amazon Linux 2015.03 v2.0.0 running Ruby 2.1 (Puma)",
          "64bit Amazon Linux 2015.03 v2.0.0 running Ruby 2.1 (Passenger Standalone)",
          "64bit Amazon Linux 2015.03 v2.0.0 running Ruby 2.0 (Puma)",
          "64bit Amazon Linux 2015.03 v2.0.0 running Ruby 2.0 (Passenger Standalone)",
          "64bit Amazon Linux 2015.03 v2.0.0 running Ruby 1.9.3",
          "64bit Amazon Linux 2015.03 v2.0.0 running Tomcat 8 Java 8",
          "64bit Amazon Linux 2015.03 v2.0.0 running Tomcat 7 Java 7",
          "64bit Amazon Linux 2015.03 v2.0.0 running Tomcat 7 Java 6",
          "64bit Windows Server Core 2012 R2 running IIS 8.5",
          "64bit Windows Server 2012 R2 running IIS 8.5",
          "64bit Windows Server 2012 running IIS 8",
          "64bit Windows Server 2008 R2 running IIS 7.5",
          "64bit Amazon Linux 2015.03 v2.0.0 running Docker 1.6.2",
          "64bit Amazon Linux 2015.03 v2.0.0 running Multi-container Docker 1.6.2 (Generic)",
          "64bit Debian jessie v2.0.0 running GlassFish 4.1 Java 8 (Preconfigured - Docker)",
          "64bit Debian jessie v2.0.0 running GlassFish 4.0 Java 7 (Preconfigured - Docker)",
          "64bit Debian jessie v2.0.0 running Go 1.4 (Preconfigured - Docker)",
          "64bit Debian jessie v2.0.0 running Go 1.3 (Preconfigured - Docker)",
          "64bit Debian jessie v2.0.0 running Python 3.4 (Preconfigured - Docker)",
      ],
      "SolutionStackDetails": [
          {
              "PermittedFileTypes": [
                  "zip"
              ],
              "SolutionStackName": "64bit Amazon Linux 2015.03 v2.0.0 running Node.js"
          },
          ...
      ]
  }

