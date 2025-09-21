**To retrieve the child accounts and OUs of a parent OU or root**

The following example you how to list the root or OU that contains that account 444444444444: ::

	aws organizations list-children --child-type ORGANIZATIONAL_UNIT --parent-id ou-examplerootid111-exampleouid111
  
The output shows the two child OUs that are contained by the parent: ::

	{
		"Children": [
			{ 
				"Id": "ou-examplerootid111-exampleouid111",
				"Type":"ORGANIZATIONAL_UNIT"
			},
			{
				"Id":"ou-examplerootid111-exampleouid222",
				"Type":"ORGANIZATIONAL_UNIT"
			}
		]
	}