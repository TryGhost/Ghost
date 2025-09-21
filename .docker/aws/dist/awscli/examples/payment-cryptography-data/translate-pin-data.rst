**To translate PIN data**

The following ``translate-pin-data`` example translates a PIN from PEK TDES encryption using ISO 0 PIN block to an AES ISO 4 PIN Block using the DUKPT algorithm. ::

    aws payment-cryptography-data translate-pin-data \
        --encrypted-pin-block "AC17DC148BDA645E" \
        --incoming-translation-attributes=IsoFormat0='{PrimaryAccountNumber=171234567890123}' \
        --incoming-key-identifier arn:aws:payment-cryptography:us-east-2:111122223333:key/ivi5ksfsuplneuyt \
        --outgoing-key-identifier arn:aws:payment-cryptography:us-east-2:111122223333:key/4pmyquwjs3yj4vwe \
        --outgoing-translation-attributes IsoFormat4="{PrimaryAccountNumber=171234567890123}" \
        --outgoing-dukpt-attributes KeySerialNumber="FFFF9876543210E00008"  

Output::

    {
        "PinBlock": "1F4209C670E49F83E75CC72E81B787D9",
        "KeyArn": "arn:aws:payment-cryptography:us-east-2:111122223333:key/ivi5ksfsuplneuyt
        "KeyCheckValue": "7CC9E2"
    }

For more information, see `Translate PIN data <https://docs.aws.amazon.com/payment-cryptography/latest/userguide/translate-pin-data.html>`__ in the *AWS Payment Cryptography User Guide*.