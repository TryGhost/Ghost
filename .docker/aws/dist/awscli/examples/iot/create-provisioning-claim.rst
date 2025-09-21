**To create a provisioning claim**

The following ``create-provisioning-claim`` example creates a provisioning claim from a provisioning template. ::

    aws iot create-provisioning-claim \
        --template-name MyTestProvisioningTemplate

Output::

    {
        "certificateId": "78de02184b2ce80cf8fb709bda59e62b19fb83513590483eb0434589476ab09f",
        "certificatePem": "-----BEGIN CERTIFICATE-----\nMIIDdzCCAl+gAwIBAgIUXSZhEBLztMLZ2fHG
    14gV0NymYY0wDQYJKoZIhvcNAQEL\nBQAwfjELMAkGA1UEBhMCVVMxEzARBgNVBAgMCldhc2hpbmd0b24xEDAOBg
    VBAcM\nB1NlYXR0bGUxGDAWBgNVBAoMD0FtYXpvbi5jb20gSW5jLjEgMB4GA1UECwwXQW1h\nem9uIElvVCBQcm9
    2aXNpb25pbmcxDDAKBgNVBAUTAzEuMDAeFw0yMDA3MjgxNjQ0\nMDZaFw0yMDA3MjgxNjUxMDZaMEsxSTBHBgNVB
    AMMQDFhNDEyM2VkNmIxYjU3MzE3\nZTgzMTJmY2MzN2FiNTdhY2MzYTZkZGVjOGQ5OGY3NzUwMWRlMjc0YjhmYTQ
    xN2Iw\nggEiMA0GCSqGSIb3EXAMPLEAA4IBDwAwggEKAoIBAQDBhKI94ktKLqTwnj+ayOq1\nTAJt/N6s6IJDZvl
    rYjkC0E7wzaeY3TprWk03S29vUzVuEOXHXQXZbihgpg2m6fza\nkWm9/wpjzE9ny5+xkPGVH4Wnwz7yK5m8S0agL
    T96cRBSWnWmonOWdY0GKVzni0CA\n+iyGudgrFKm7Eae/v18oXrf82KtOAGO4xG0KE2WKYHsT1fx3c9xZhlXP/eX
    Lhv00\n+lGp0WVw9PbhKfrxliKJ5q6sL5nVUaUHq6hlQPYwsATeOvAp3u0ak5zgTyL0fg7Y\nPyKk6VYwLW62r+V
    YBSForEMOAhkq3LsP/rjxpEKmi2W4lPVS6oFZRKcD+H1Kyil5\nAgMBAAGjIDAeMAwGA1UdEwEB/wQCMAAwDgYDV
    R0PAQH/BAQDAgeAMA0GCSqGSIb3\nDQEBCwUAA4IBAQAGgix2k6nVqbZFKq97/fZBzLGS0dyz5rT/E41cDIRX+1j
    EPW41\nw0D+2sXheCZLZZnSkvIiP74IToNeXDrjdcaodeGFVHIElRjhMIq+4ZebPbRLtidF\nRc2hfcTAlqq9Z6v
    5Vk6BeM1tu0RqH1wPoVUccLPya8EjNCbnJZUmGdOfrN/Y9pho\n5ikV+HPeZhG/k6dhE2GsQJyKFVHL/uBgKSily
    1bRyWU1r6qcpWBNBHjUoD7HgOwD\nnzMh4XRb2FQDsqFalkCSYmeL8IVC49sgPD9Otyp5uteGMTy62usAAUQdq/f
    ZvrWg\nOkFpwMVnGKVKT7Kg0kKOLzKWOBB2Jm4/gmrJ\n-----END CERTIFICATE-----\n",
        "keyPair": {
            "PublicKey": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCg
    KCAQEAwYSiPeJLSi6k8J4/msjq\ntUwCbfzerOiCQ2b5a2I5AtBO8M2nmN06a1pNN0tvb1M1bhDlx10F2W4oYKYN
    pun8\n2pFpvf8KY8xPZ8ufsZDxlR+Fp8M+8iuZvEtGoC0/enEQUlp1pqJzlnWNBilc54tA\ngPoshrnYKxSpuxGn
    v79fKF63/NirTgBjuMRtChNlimEXAMPLE3PcWYZVz/3ly4b9\nNPpRqdFlcPT24Sn68ZYiieaurC+Z1VGlB6uoZU
    D2MLAE3jrwKd7tGpOc4E8i9H4O\n2D8ipOlWMC1utq/lWAUhaKxDDgIZKty7D/648aRCpotluJT1UuqBWUSnA/h9
    Ssop\neQIDAQAB\n-----END PUBLIC KEY-----\n",
            "PrivateKey": "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEAwYSiPeJLSi6k8J4/
    msjqtUwCbfzerOiCQ2b5a2I5AtBO8M2n\nmN06a1pNN0tvb1M1bhDlx10F2W4oYKYNpun82pFpvf8KY8xPZ8ufsZ
    DxlR+Fp8M+\n8iuZvEtGoC0/enEQUlp1pqJzlnWNBilc54tAgPoshrnYKxSpuxGnv79fKF63/Nir\nTgBjuMRtCh
    NlimB7E9X8d3PcWYZVz/3ly4b9NPpRqdFlcPT24Sn68ZYiieaurC+Z\n1VGlB6uoZUD2MLAE3jrwKd7tGpOc4E8i
    9H4O2D8ipOlWMC1utq/lWAUhaKxDDgIZ\nKty7D/648aRCpotluJT1UuqBWUSnA/h9SsopeQIDAQABAoIBAEAybN
    QUtx9T2/nK\ntZT2pA4iugecxI4dz+DmT0XVXs5VJmrx/nBSq6ejXExEpSIMO4RY7LE3ZdJcnd56\nF7tQkkY7yR
    VzfxHeXFU1krOIPuxWebNOrRoPZr+1RSer+wv2aBC525+88pVuR6tM\nm3pgkrR2ycCj9FdOUoQxdjHBHaM5PDmJ
    9aSxCKdg3nReepeGwsR2TQA+m2vVxWk7\nou0+91eTOP+/QfP7P8ZjOIkO2XivlRcVDyN/E4QXPKuIkM/8vS8VK+
    E9pATQ0MtB\n2lw8R/YU5AJd6jlEXAMPLEGU2UzRzInNWiLtkPPPqgqXXhxOf+mxByjcMalVJk0L\nhOG2ROUCgY
    EA+ROcHNHy/XbsP7FihOhEh+6Q2QxQ2ncBUPYbBazrR8Hn+7SCICQK\nVyYfd8Ajfq3e7RsKVL5SlMBp7Slidxak
    bIn28fKfPn62DaemGCIoyDgLpF+eUxBx\ngzbCiBZga8brfurza43UZjKZLpg3hq721+FeAiXi1Nma4Yr9YWEHEN
    8CgYEAxuWt\npzdWWmsiFzfsAw0sy9ySDA/xr5WRWzJyAqUsjsks6rxNzWebpufnYHcmtW7pLdqM\nkboHwN2pXa
    kmZvrk2nKkEMq5brBYGDXuxDe+V369Bianx8aZFyIsckA7OwXW1w1h\ngRC5rQ4XOgp3+Jmw7eAO8LRYDjaN846+
    QbtO2KcCgYAWS0UL51bijQR0ZwI0dz27\nFQVuCAYsp748aurcRTACCj8jbnK/QbqTNlxWsaH7ssBjZKo2D5sAqY
    BRtASWODab\naHXsDhVm2Jye+ESLoHMaCLoyCkT3ll8yqXIcEDStMO7fO1Ryag164EiJvSIrMfny\nNL/fXVjCSH
    /udCxdzPt+7QKBgQC+LAD7rxdr4J9538hTqpc4XK9vxRbrMXEH55XH\nHbMa2xONZXpmeTgEQBukyohCVceyRhK9
    i0e6irZTjVXghOeoTpC8VXkzcnzouTiQ\neFQQSGfnp7Ioe6UIz23715pKduzSNkMSKrG924ktv7CyDBF1gBQI5g
    aDoHnddJBJ\nPRTIZQKBgA8MASXtTxQntRwXXzR92U0vAighiuRkB/mx9jQpUcK1qiqHbkAMqgNF\nPFCBYIUbFT
    iYKKKeJNbyJQvjfsJCkAnaFJ+RnTxk0Q6Wjm20peJ/ii4QiDdnigoE\nvdlc5cFQewWb4/zqAtPdinkPlN94ileI
    79XQdc7RlJ0jpgTimL+V\n-----END RSA PRIVATE KEY-----\n"
        },
        "expiration": 1595955066.0
    }

For more information, see `Provisioning by trusted user <https://docs.aws.amazon.com/iot/latest/developerguide/provision-wo-cert.html#trusted-user>`__ in the *AWS IoT Core Developers Guide*.
