**To list event subscriptions**

The following ``list-event-subscriptions`` command lists all the event subscriptions for the assessment template with the ARN of ``arn:aws:inspector:us-west-2:123456789012:target/0-nvgVhaxX/template/0-7sbz2Kz0``::

  aws inspector list-event-subscriptions --resource-arn arn:aws:inspector:us-west-2:123456789012:target/0-nvgVhaxX/template/0-7sbz2Kz0

Output::

  {
	"subscriptions": [
	  {
		"eventSubscriptions": [
		  {
			"event": "ASSESSMENT_RUN_COMPLETED",
			"subscribedAt": 1459455440.867
		  }
		],
		"resourceArn": "arn:aws:inspector:us-west-2:123456789012:target/0-nvgVhaxX/template/0-7sbz2Kz0",
		"topicArn": "arn:aws:sns:us-west-2:123456789012:exampletopic"
	  }
	]
  }

For more information, see `Amazon Inspector Assessment Templates and Assessment Runs`_ in the *Amazon Inspector* guide.

.. _`Amazon Inspector Assessment Templates and Assessment Runs`: https://docs.aws.amazon.com/inspector/latest/userguide/inspector_assessments.html

