**To get the configuration history of an AWS resource**

The following command returns a list of configuration items for an EC2 instance with an ID of ``i-1a2b3c4d``::

    aws configservice get-resource-config-history --resource-type AWS::EC2::Instance --resource-id i-1a2b3c4d