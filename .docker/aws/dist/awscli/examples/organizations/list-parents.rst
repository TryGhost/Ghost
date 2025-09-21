**To list the parent OUs or roots for an account or child OU**

The following example you how to list the root or parent OU that contains that account 444444444444: ::

	aws organizations list-parents --child-id 444444444444

  
The output shows that the specified account is in the OU with specified ID: ::

	{
	  "Parents": [
		{
		  "Id": "ou-examplerootid111-exampleouid111",
		  "Type": "ORGANIZATIONAL_UNIT"
		}
	  ]
	}