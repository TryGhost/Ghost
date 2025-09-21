**To create a device certificate from a certificate signing request (CSR)**

The following ``create-certificate-from-csr`` example creates a device certificate from a CSR. You can use the ``openssl`` command to create a CSR. ::

    aws iot create-certificate-from-csr \
        --certificate-signing-request=file://certificate.csr

Output::

    {
        "certificateArn": "arn:aws:iot:us-west-2:123456789012:cert/c0c57bbc8baaf4631a9a0345c957657f5e710473e3ddbee1428d216d54d53ac9",
            "certificateId": "c0c57bbc8baaf4631a9a0345c957657f5e710473e3ddbee1428d216d54d53ac9",
            "certificatePem": "<certificate-text>"
    }

For more information, see `CreateCertificateFromCSR <https://docs.aws.amazon.com/iot/latest/apireference/API_CreateCertificateFromCsr.html>`__ in the *AWS IoT API Reference*.
