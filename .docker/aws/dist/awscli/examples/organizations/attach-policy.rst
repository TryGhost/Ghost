**To attach a policy to a root, OU, or account**

**Example 1**

The following example shows how to attach a service control policy (SCP) to an OU: ::

	aws organizations attach-policy 
			--policy-id p-examplepolicyid111
			--target-id ou-examplerootid111-exampleouid111
			
**Example 2**

The following example shows how to attach a service control policy directly to an account: ::

	aws organizations attach-policy 
			--policy-id p-examplepolicyid111
			--target-id 333333333333
