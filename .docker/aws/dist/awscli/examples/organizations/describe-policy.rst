**To get information about a policy**

The following example shows how to request information about a policy: ::

	aws organizations describe-policy --policy-id p-examplepolicyid111
	
The output includes a policy object that contains details about the policy: ::

	{
		"Policy": {
			"Content": "{\n  \"Version\": \"2012-10-17\",\n  \"Statement\": [\n    {\n      \"Effect\": \"Allow\",\n      \"Action\": \"*\",\n      \"Resource\": \"*\"\n    }\n  ]\n}",
			"PolicySummary": {
				"Arn": "arn:aws:organizations::111111111111:policy/o-exampleorgid/service_control_policy/p-examplepolicyid111",
				"Type": "SERVICE_CONTROL_POLICY",
				"Id": "p-examplepolicyid111",
				"AwsManaged": false,
				"Name": "AllowAllS3Actions",
				"Description": "Enables admins to delegate S3 permissions"
			}
		}
	}