**To get the details about an account**

The following example shows you how to request details about an account: ::

	aws organizations describe-account --account-id 555555555555
	
The output shows an account object with the details about the account: ::

	{
		"Account": {
			"Id": "555555555555",
			"Arn": "arn:aws:organizations::111111111111:account/o-exampleorgid/555555555555",
			"Name": "Beta account",
			"Email": "anika@example.com",
			"JoinedMethod": "INVITED",
			"JoinedTimeStamp": 1481756563.134,
			"Status": "ACTIVE"
		}
	}