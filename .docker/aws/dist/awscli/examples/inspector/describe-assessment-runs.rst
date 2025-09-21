**To describe assessment runs**

The following ``describe-assessment-run`` command describes an assessment run with the ARN of ``arn:aws:inspector:us-west-2:123456789012:target/0-0kFIPusq/template/0-4r1V2mAw/run/0-MKkpXXPE``::

  aws inspector describe-assessment-runs --assessment-run-arns arn:aws:inspector:us-west-2:123456789012:target/0-0kFIPusq/template/0-4r1V2mAw/run/0-MKkpXXPE

Output::

 {
	 "assessmentRuns": [
	   {
		 "arn": "arn:aws:inspector:us-west-2:123456789012:target/0-0kFIPusq/template/0-4r1V2mAw/run/0-MKkpXXPE",
		 "assessmentTemplateArn": "arn:aws:inspector:us-west-2:123456789012:target/0-0kFIPusq/template/0-4r1V2mAw",
		 "completedAt": 1458680301.4,
		 "createdAt": 1458680170.035,
		 "dataCollected": true,
		 "durationInSeconds": 3600,
		 "name": "Run 1 for ExampleAssessmentTemplate",
		 "notifications": [],
		 "rulesPackageArns": [
		   "arn:aws:inspector:us-west-2:758058086616:rulespackage/0-X1KXtawP"
		 ],
		 "startedAt": 1458680170.161,
		 "state": "COMPLETED",
		 "stateChangedAt": 1458680301.4,
		 "stateChanges": [
		   {
			 "state": "CREATED",
			 "stateChangedAt": 1458680170.035
		   },
		   {
			 "state": "START_DATA_COLLECTION_PENDING",
			 "stateChangedAt": 1458680170.065
		   },
		   {
			 "state": "START_DATA_COLLECTION_IN_PROGRESS",
			 "stateChangedAt": 1458680170.096
		   },
		   {
			 "state": "COLLECTING_DATA",
			 "stateChangedAt": 1458680170.161
		   },
		   {
			 "state": "STOP_DATA_COLLECTION_PENDING",
			 "stateChangedAt": 1458680239.883
		   },
		   {
			 "state": "DATA_COLLECTED",
			 "stateChangedAt": 1458680299.847
		   },
		   {
			 "state": "EVALUATING_RULES",
			 "stateChangedAt": 1458680300.099
		   },
		   {
			 "state": "COMPLETED",
			 "stateChangedAt": 1458680301.4
		   }
		 ],
		 "userAttributesForFindings": []
	   }
	 ],
	 "failedItems": {}
 }

For more information, see `Amazon Inspector Assessment Templates and Assessment Runs`_ in the *Amazon Inspector* guide.

.. _`Amazon Inspector Assessment Templates and Assessment Runs`: https://docs.aws.amazon.com/inspector/latest/userguide/inspector_assessments.html

