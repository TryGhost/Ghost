**To remove a tag from a server certificate**

The following ``untag-server-certificate`` command removes any tag with the key name 'Department' from the specified server certificate. ::

    aws iam untag-server-certificate \
        --server-certificate-name ExampleCertificate \
        --tag-keys Department

This command produces no output.

For more information, see `Tagging IAM resources <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_tags.html>`__ in the *AWS IAM User Guide*.