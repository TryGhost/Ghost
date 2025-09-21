**To describe findings**

The following ``describe-findings`` command describes the finding with the ARN of ``arn:aws:inspector:us-west-2:123456789012:target/0-0kFIPusq/template/0-4r1V2mAw/run/0-MKkpXXPE/finding/0-HwPnsDm4``::

  aws inspector describe-findings --finding-arns arn:aws:inspector:us-west-2:123456789012:target/0-0kFIPusq/template/0-4r1V2mAw/run/0-MKkpXXPE/finding/0-HwPnsDm4

Output::

   {
	 "failedItems": {},
	 "findings": [
	   {
		 "arn": "arn:aws:inspector:us-west-2:123456789012:target/0-0kFIPusq/template/0-4r1V2mAw/run/0-MKkpXXPE/finding/0-HwPnsDm4",
		 "assetAttributes": {
		   "ipv4Addresses": [],
		   "schemaVersion": 1
		 },
		 "assetType": "ec2-instance",
		 "attributes": [],
		 "confidence": 10,
		 "createdAt": 1458680301.37,
		 "description": "Amazon Inspector did not find any potential security issues during this assessment.",
		 "indicatorOfCompromise": false,
		 "numericSeverity": 0,
		 "recommendation": "No remediation needed.",
		 "schemaVersion": 1,
		 "service": "Inspector",
		 "serviceAttributes": {
		   "assessmentRunArn": "arn:aws:inspector:us-west-2:123456789012:target/0-0kFIPusq/template/0-4r1V2mAw/run/0-MKkpXXPE",
		   "rulesPackageArn": "arn:aws:inspector:us-west-2:758058086616:rulespackage/0-X1KXtawP",
		   "schemaVersion": 1
		 },
		 "severity": "Informational",
		 "title": "No potential security issues found",
		 "updatedAt": 1458680301.37,
		 "userAttributes": []
	   }
	 ]
   }  

For more information, see `Amazon Inspector Findings`_ in the *Amazon Inspector* guide.

.. _`Amazon Inspector Findings`: https://docs.aws.amazon.com/inspector/latest/userguide/inspector_findings.html

