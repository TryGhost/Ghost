**To remove a tag from an accelerator**

The following ``untag-resource`` example removes the tags Name and Project from an accelerator. ::

    aws globalaccelerator untag-resource \
        --resource-arn arn:aws:globalaccelerator::012345678901:accelerator/1234abcd-abcd-1234-abcd-1234abcdefgh \
        --tag-keys Key="Name" Key="Project"

This command produces no output.

For more information, see `Tagging in AWS Global Accelerator <https://docs.aws.amazon.com/global-accelerator/latest/dg/tagging-in-global-accelerator.html>`__ in the *AWS Global Accelerator Developer Guide*.