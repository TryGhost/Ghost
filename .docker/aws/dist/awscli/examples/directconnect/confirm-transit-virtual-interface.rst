**To accept ownership of a transit virtual interface**

The following ``confirm-transit-virtual-interface`` accepts ownership of a transit virtual interface created by another customer. ::

    aws directconnect confirm-transit-virtual-interface \
        --virtual-interface-id dxvif-fEXAMPLE \
        --direct-connect-gateway-id 4112ccf9-25e9-4111-8237-b6c5dEXAMPLE

Output::

    {
        "virtualInterfaceState": "pending"
    }

For more information, see `Accepting a Hosted Virtual Interface <https://docs.aws.amazon.com/directconnect/latest/UserGuide/accepthostedvirtualinterface.html>`__ in the *AWS Direct Connect User Guide*.
