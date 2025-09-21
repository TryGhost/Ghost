**Add a model**

The following command adds a service model from a file named ``service.json``::

  aws configure add-model --service-model file://service.json

Adding a model replaces existing commands for the service defined in the model. To leave existing commands as-is, specify a different service name to use for the new commands::

  aws configure add-model --service-model file://service.json --service-name service2
