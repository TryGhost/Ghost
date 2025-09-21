**To tag an accelerator**

The following ``tag-resource`` example adds tags Name and Project to an accelerator, along with corresponding values for each. ::

    aws globalaccelerator tag-resource \
        --resource-arn arn:aws:globalaccelerator::012345678901:accelerator/1234abcd-abcd-1234-abcd-1234abcdefgh \
        --tags Key="Name",Value="Example Name" Key="Project",Value="Example Project"

This command produces no output.

For more information, see `Tagging in AWS Global Accelerator <https://docs.aws.amazon.com/global-accelerator/latest/dg/tagging-in-global-accelerator.html>`__ in the *AWS Global Accelerator Developer Guide*.