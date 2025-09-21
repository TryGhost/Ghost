**To view a list of entitlements**

The following ``list-entitlements`` example displays a list of all entitlements that have been granted to the account. ::

    aws mediaconnect list-entitlements

Output::

   {
       "Entitlements": [
           {
               "EntitlementArn": "arn:aws:mediaconnect:us-west-2:111122223333:entitlement:1-11aa22bb11aa22bb-3333cccc4444:MyEntitlement",
               "EntitlementName": "MyEntitlement"
           }
       ]
   }

For more information, see `ListEntitlements <https://docs.aws.amazon.com/mediaconnect/latest/api/v1-entitlements.html>`__ in the *AWS Elemental MediaConnect API Reference*.
