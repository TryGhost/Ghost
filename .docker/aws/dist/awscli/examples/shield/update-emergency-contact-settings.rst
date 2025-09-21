**To define the emergency e-mail addresses that are on file with the DRT**

The following ``update-emergency-contact-settings`` example defines two e-mail addresses that the DRT should contact when it's responding to a suspected attack. ::

    aws shield update-emergency-contact-settings \
	    --emergency-contact-list EmailAddress=ops@example.com EmailAddress=ddos-notifications@example.com

This command produces no output.  
        
For more information, see `How AWS Shield Works <https://docs.aws.amazon.com/waf/latest/developerguide/ddos-overview.html>`__ in the *AWS Shield Advanced Developer Guide*.
