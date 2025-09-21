**To retrieve a list of all policies in an organization of a certain type**

The following example shows you how to get a list of SCPs, as specified by the filter parameter: ::

	aws organizations list-policies --filter SERVICE_CONTROL_POLICY
  
The output includes a list of policies with summary information: ::

	{
		"Policies": [
			{
				"Type": "SERVICE_CONTROL_POLICY",
				"Name": "AllowAllS3Actions",
				"AwsManaged": false,
				"Id": "p-examplepolicyid111",
				"Arn": "arn:aws:organizations::111111111111:policy/service_control_policy/p-examplepolicyid111",
				"Description": "Enables account admins to delegate permissions for any S3 actions to users and roles in their accounts."
			},
			{
				"Type": "SERVICE_CONTROL_POLICY",
				"Name": "AllowAllEC2Actions",
				"AwsManaged": false,
				"Id": "p-examplepolicyid222",
				"Arn": "arn:aws:organizations::111111111111:policy/service_control_policy/p-examplepolicyid222",
				"Description": "Enables account admins to delegate permissions for any EC2 actions to users and roles in their accounts."
			},
			{
				"AwsManaged": true,
				"Description": "Allows access to every operation",
				"Type": "SERVICE_CONTROL_POLICY",
				"Id": "p-FullAWSAccess",
				"Arn": "arn:aws:organizations::aws:policy/service_control_policy/p-FullAWSAccess",
				"Name": "FullAWSAccess"
			}
		]
	}