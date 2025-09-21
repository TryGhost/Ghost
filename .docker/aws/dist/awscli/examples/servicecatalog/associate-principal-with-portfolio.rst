**To associate a principal with a portfolio**

The following ``associate-principal-with-portfolio`` example associates a user with the specified portfolio. ::

    aws servicecatalog associate-principal-with-portfolio \
        --portfolio-id port-2s6abcdefwdh4 \
        --principal-arn arn:aws:iam::123456789012:user/usertest \
        --principal-type IAM

This command produces no output.
