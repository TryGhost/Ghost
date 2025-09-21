**To create a device pool**

The following command creates an Android device pool for a project::

  aws devicefarm create-device-pool --name pool1 --rules file://device-pool-rules.json --project-arn "arn:aws:devicefarm:us-west-2:123456789012:project:070fc3ca-7ec1-4741-9c1f-d3e044efc506"

You can get the project ARN from the output of ``create-project`` or ``list-projects``. The file ``device-pool-rules.json`` is a JSON document in the current folder that specifies the device platform::

  [
      {
          "attribute": "PLATFORM",
          "operator": "EQUALS",
          "value": "\"ANDROID\""
      }
  ]

Output::

  {
      "devicePool": {
          "rules": [
              {
                  "operator": "EQUALS",
                  "attribute": "PLATFORM",
                  "value": "\"ANDROID\""
              }
          ],
          "type": "PRIVATE",
          "name": "pool1",
          "arn": "arn:aws:devicefarm:us-west-2:123456789012:devicepool:070fc3ca-7ec1-4741-9c1f-d3e044efc506/2aa8d2a9-5e73-47ca-b929-659cb34b7dcd"
      }
  }
