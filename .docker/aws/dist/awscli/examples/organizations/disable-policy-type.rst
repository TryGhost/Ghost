**To disable a policy type in a root**

The following example shows how to disable the service control policy (SCP) policy type in a root: ::

	aws organizations disable-policy-type --root-id r-examplerootid111 --policy-type SERVICE_CONTROL_POLICY

The output shows that the PolicyTypes response element no longer includes SERVICE_CONTROL_POLICY: ::

	{
		"Root": {
			"PolicyTypes": [],
			"Name": "Root",
			"Id": "r-examplerootid111",
			"Arn": "arn:aws:organizations::111111111111:root/o-exampleorgid/r-examplerootid111"
		}
	}