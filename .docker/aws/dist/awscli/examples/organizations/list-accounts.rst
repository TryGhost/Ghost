**To retrieve a list of all of the accounts in an organization**

The following example shows you how to request a list of the accounts in an organization: ::

	aws organizations list-accounts

The output includes a list of account summary objects. ::
  
	{
		"Accounts": [
			{
				"Arn": "arn:aws:organizations::111111111111:account/o-exampleorgid/111111111111",
				"JoinedMethod": "INVITED",
				"JoinedTimestamp": 1481830215.45,
				"Id": "111111111111",
				"Name": "Master Account",
				"Email": "bill@example.com",
				"Status": "ACTIVE"
			},
			{
				"Arn": "arn:aws:organizations::111111111111:account/o-exampleorgid/222222222222",
				"JoinedMethod": "INVITED",
				"JoinedTimestamp": 1481835741.044,
				"Id": "222222222222",
				"Name": "Production Account",
				"Email": "alice@example.com",
				"Status": "ACTIVE"
			},
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