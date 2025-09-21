**To retrieve a list of all of the accounts in a specified parent root or OU**

The following example shows how to request a list of the accounts in an OU: ::

	aws organizations list-accounts-for-parent --parent-id ou-examplerootid111-exampleouid111

The output includes a list of account summary objects. ::
  
	{
		"Accounts": [
			{
				"Arn": "arn:aws:organizations::111111111111:account/o-exampleorgid/333333333333",
				"JoinedMethod": "INVITED",
				"JoinedTimestamp": 1481835795.536,
				"Id": "333333333333",
				"Name": "Development Account",
				"Email": "juan@example.com",
				"Status": "ACTIVE"
			},
			{
				"Arn": "arn:aws:organizations::111111111111:account/o-exampleorgid/444444444444",
				"JoinedMethod": "INVITED",
				"JoinedTimestamp": 1481835812.143,
				"Id": "444444444444",
				"Name": "Test Account",
				"Email": "anika@example.com",
				"Status": "ACTIVE"
			}
		]
	}