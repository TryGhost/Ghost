**To list projects**

The following retrieves a list of projects::

  aws devicefarm list-projects

Output::

  {
      "projects": [
          {
              "name": "myproject",
              "arn": "arn:aws:devicefarm:us-west-2:123456789012:project:070fc3ca-7ec1-4741-9c1f-d3e044efc506",
              "created": 1503612890.057
          },
          {
              "name": "otherproject",
              "arn": "arn:aws:devicefarm:us-west-2:123456789012:project:a5f5b752-8098-49d1-86bf-5f7682c1c77e",
              "created": 1505257519.337
          }
      ]
  }
