**To generate a verified domain's DKIM tokens for DKIM signing with Amazon SES**

The following example uses the ``verify-domain-dkim`` command to generate DKIM tokens for a domain that has been verified with Amazon SES::

    aws ses verify-domain-dkim --domain example.com

Output::

 {
    "DkimTokens": [
        "EXAMPLEq76owjnks3lnluwg65scbemvw",
        "EXAMPLEi3dnsj67hstzaj673klariwx2",
        "EXAMPLEwfbtcukvimehexktmdtaz6naj"
    ]
 }

To set up DKIM, you must use the returned DKIM tokens to update your domain's DNS settings with CNAME records that point to DKIM public keys hosted by Amazon SES. For more information, see `Easy DKIM in Amazon SES`_ in the *Amazon Simple Email Service Developer Guide*.

.. _`Easy DKIM in Amazon SES`: http://docs.aws.amazon.com/ses/latest/DeveloperGuide/easy-dkim.html
