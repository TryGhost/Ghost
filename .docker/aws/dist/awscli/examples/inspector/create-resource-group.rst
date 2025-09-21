**To create a resource group**

The following ``create-resource-group`` command creates a resource group using the tag key of ``Name`` and value of ``example``::

  aws inspector create-resource-group --resource-group-tags key=Name,value=example

Output::

  {
     "resourceGroupArn": "arn:aws:inspector:us-west-2:123456789012:resourcegroup/0-AB6DMKnv"
  }

For more information, see `Amazon Inspector Assessment Targets`_ in the *Amazon Inspector* guide.

.. _`Amazon Inspector Assessment Targets`: https://docs.aws.amazon.com/inspector/latest/userguide/inspector_applications.html

