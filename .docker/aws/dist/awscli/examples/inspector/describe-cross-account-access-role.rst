**To describe the cross account access role**

The following ``describe-cross-account-access-role`` command describes the IAM role that enables Amazon Inspector to access your AWS account::

  aws inspector describe-cross-account-access-role

Output::

 {
	 "registeredAt": 1458069182.826,
	 "roleArn": "arn:aws:iam::123456789012:role/inspector",
	 "valid": true
 } 

For more information, see `Setting up Amazon Inspector`_ in the *Amazon Inspector* guide.

.. _`Setting up Amazon Inspector`: https://docs.aws.amazon.com/inspector/latest/userguide/inspector_settingup.html

