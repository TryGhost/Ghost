**To retrieve a list of the roots in an organization**

This example shows you how to get the list of roots for an organization: ::

	aws organizations list-roots 
  
The output includes a list of root structures with summary information: ::

	{
		"Roots": [
			{
				"Name": "Root",
				"Arn": "arn:aws:organizations::111111111111:root/o-exampleorgid/r-examplerootid111",
				"Id": "r-examplerootid111",
				"PolicyTypes": [
					{
						"Status":"ENABLED",
						"Type":"SERVICE_CONTROL_POLICY"
					}
				]
			}
		]
	}