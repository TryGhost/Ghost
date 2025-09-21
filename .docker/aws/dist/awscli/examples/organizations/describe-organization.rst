**To get information about the current organization**

The following example shows you how to request details about an organization: ::

	aws organizations describe-organization
	
The output includes an organization object that has the details about the organization: ::

	{
		"Organization": {
			"MasterAccountArn": "arn:aws:organizations::111111111111:account/o-exampleorgid/111111111111",
			"MasterAccountEmail": "bill@example.com",
			"MasterAccountId": "111111111111",
			"Id": "o-exampleorgid",
			"FeatureSet": "ALL",
			"Arn": "arn:aws:organizations::111111111111:organization/o-exampleorgid",
			"AvailablePolicyTypes": [
				{
					"Status": "ENABLED",
					"Type": "SERVICE_CONTROL_POLICY"
				}
			]
		}
	}