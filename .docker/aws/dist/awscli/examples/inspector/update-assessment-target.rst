**To update an assessment target**

The following ``update-assessment-target`` command updates the assessment target with the ARN of ``arn:aws:inspector:us-west-2:123456789012:target/0-nvgVhaxX`` and the name of ``Example``, and the resource group with the ARN of ``arn:aws:inspector:us-west-2:123456789012:resourcegroup/0-yNbgL5Pt``::

  aws inspector update-assessment-target --assessment-target-arn arn:aws:inspector:us-west-2:123456789012:target/0-nvgVhaxX --assessment-target-name Example --resource-group-arn arn:aws:inspector:us-west-2:123456789012:resourcegroup/0-yNbgL5Pt

For more information, see `Amazon Inspector Assessment Targets`_ in the *Amazon Inspector* guide.

.. _`Amazon Inspector Assessment Targets`: https://docs.aws.amazon.com/inspector/latest/userguide/inspector_applications.html

