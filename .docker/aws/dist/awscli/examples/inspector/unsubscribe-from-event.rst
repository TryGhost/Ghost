**To unsubscribe from an event**

The following ``unsubscribe-from-event`` command disables the process of sending Amazon SNS notifications about the ``ASSESSMENT_RUN_COMPLETED`` event to the topic with the ARN of ``arn:aws:sns:us-west-2:123456789012:exampletopic``::

  aws inspector unsubscribe-from-event --event ASSESSMENT_RUN_COMPLETED --resource-arn arn:aws:inspector:us-west-2:123456789012:target/0-nvgVhaxX/template/0-7sbz2Kz0 --topic arn:aws:sns:us-west-2:123456789012:exampletopic

For more information, see `Amazon Inspector Assessment Templates and Assessment Runs`_ in the *Amazon Inspector* guide.

.. _`Amazon Inspector Assessment Templates and Assessment Runs`: https://docs.aws.amazon.com/inspector/latest/userguide/inspector_assessments.html

