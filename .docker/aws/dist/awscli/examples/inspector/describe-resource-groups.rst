**To describe resource groups**

The following ``describe-resource-groups`` command describes the resource group with the ARN of ``arn:aws:inspector:us-west-2:123456789012:resourcegroup/0-PyGXopAI``::

  aws inspector describe-resource-groups --resource-group-arns arn:aws:inspector:us-west-2:123456789012:resourcegroup/0-PyGXopAI

Output::

   {
	 "failedItems": {},
	 "resourceGroups": [
	   {
		 "arn": "arn:aws:inspector:us-west-2:123456789012:resourcegroup/0-PyGXopAI",
		 "createdAt": 1458074191.098,
		 "tags": [
		   {
			 "key": "Name",
			 "value": "example"
		   }
		 ]
	   }
	 ]
   }  

For more information, see `Amazon Inspector Assessment Targets`_ in the *Amazon Inspector* guide.

.. _`Amazon Inspector Assessment Targets`: https://docs.aws.amazon.com/inspector/latest/userguide/inspector_applications.html

