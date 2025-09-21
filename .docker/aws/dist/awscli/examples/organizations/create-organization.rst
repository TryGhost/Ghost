**Example 1: To create a new organization**

Bill wants to create an organization using credentials from account 111111111111. The following example shows that the account becomes the master account in the new organization. Because he does not specify a features set, the new organization defaults to all features enabled and service control policies are enabled on the root. ::

	aws organizations create-organization
	
The output includes an organization object with details about the new organization: ::

	{
		"Organization": {
			"AvailablePolicyTypes": [
				{
					"Status": "ENABLED",
					"Type": "SERVICE_CONTROL_POLICY"
				}
			],
			"MasterAccountId": "111111111111",
			"MasterAccountArn": "arn:aws:organizations::111111111111:account/o-exampleorgid/111111111111",
			"MasterAccountEmail": "bill@example.com",
			"FeatureSet": "ALL",
			"Id": "o-exampleorgid",
			"Arn": "arn:aws:organizations::111111111111:organization/o-exampleorgid"
		}
	}

**Example 2: To create a new organization with only consolidated billing features enabled**

The following example creates an organization that supports only the consolidated billing features: ::

	aws organizations create-organization --feature-set CONSOLIDATED_BILLING
	
The output includes an organization object with details about the new organization: ::

	{
		"Organization": {
			"Arn": "arn:aws:organizations::111111111111:organization/o-exampleorgid",
			"AvailablePolicyTypes": [],
			"Id": "o-exampleorgid",
			"MasterAccountArn": "arn:aws:organizations::111111111111:account/o-exampleorgid/111111111111",
			"MasterAccountEmail": "bill@example.com",
			"MasterAccountId": "111111111111",
			"FeatureSet": "CONSOLIDATED_BILLING"
		}
	}

For more information, see `Creating an Organization`_ in the *AWS Organizations Users Guide*.

.. _`Creating an Organization`: http://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_create.html
