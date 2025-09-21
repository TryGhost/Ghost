**To describe all the attributes for your AWS account**

This example describes the attributes for your AWS account.

Command::

  aws ec2 describe-account-attributes

Output::

  {
      "AccountAttributes": [
          {
              "AttributeName": "vpc-max-security-groups-per-interface",
              "AttributeValues": [
                  {
                      "AttributeValue": "5"
                  }
              ]
          },
          {
              "AttributeName": "max-instances",
              "AttributeValues": [
                  {
                      "AttributeValue": "20"
                  }
              ]
          },
          {
              "AttributeName": "supported-platforms",
              "AttributeValues": [
                  {
                      "AttributeValue": "EC2"
                  },
                  {
                      "AttributeValue": "VPC"
                  }
              ]
          },
          {
              "AttributeName": "default-vpc",
              "AttributeValues": [
                  {
                      "AttributeValue": "none"
                  }
              ]
          },
          {
              "AttributeName": "max-elastic-ips",
              "AttributeValues": [
                  {
                      "AttributeValue": "5"
                  }
              ]
          },
          {
              "AttributeName": "vpc-max-elastic-ips",
              "AttributeValues": [
                  {
                      "AttributeValue": "5"
                  }
              ]
          }
      ]
  }

**To describe a single attribute for your AWS account**

This example describes the ``supported-platforms`` attribute for your AWS account.

Command::

  aws ec2 describe-account-attributes --attribute-names supported-platforms

Output::

  {
      "AccountAttributes": [
          {
              "AttributeName": "supported-platforms",
              "AttributeValues": [
                  {
                      "AttributeValue": "EC2"
                  },
                  {
                      "AttributeValue": "VPC"
                  }
              ]
          }
      ]
  }

