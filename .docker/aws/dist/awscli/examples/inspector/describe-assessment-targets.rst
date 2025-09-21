**To describe assessment targets**

The following ``describe-assessment-targets`` command describes the assessment target with the ARN of ``arn:aws:inspector:us-west-2:123456789012:target/0-0kFIPusq``::

  aws inspector describe-assessment-targets --assessment-target-arns arn:aws:inspector:us-west-2:123456789012:target/0-0kFIPusq

Output::

   {
	 "assessmentTargets": [
	   {
		 "arn": "arn:aws:inspector:us-west-2:123456789012:target/0-0kFIPusq",
		 "createdAt": 1458074191.459,
		 "name": "ExampleAssessmentTarget",
		 "resourceGroupArn": "arn:aws:inspector:us-west-2:123456789012:resourcegroup/0-PyGXopAI",
		 "updatedAt": 1458074191.459
	   }
	 ],
	 "failedItems": {}
   }  

For more information, see `Amazon Inspector Assessment Targets`_ in the *Amazon Inspector* guide.

.. _`Amazon Inspector Assessment Targets`: https://docs.aws.amazon.com/inspector/latest/userguide/inspector_applications.html

