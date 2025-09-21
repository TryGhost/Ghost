**To register the cross account access role**

The following ``register-cross-account-access-role`` command registers the IAM role with the ARN of  ``arn:aws:iam::123456789012:role/inspector`` that Amazon Inspector uses to list your EC2 instances at the start of the assessment run of when you call the preview-agents command::

  aws inspector register-cross-account-access-role --role-arn arn:aws:iam::123456789012:role/inspector

For more information, see `Setting up Amazon Inspector`_ in the *Amazon Inspector* guide.

.. _`Setting up Amazon Inspector`: https://docs.aws.amazon.com/inspector/latest/userguide/inspector_settingup.html

