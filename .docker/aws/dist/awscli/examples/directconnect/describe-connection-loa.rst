**To describe your LOA-CFA for a connection using Linux or Mac OS X**

The following example describes your LOA-CFA for connection ``dxcon-fh6ayh1d``. The contents of the LOA-CFA are base64-encoded. This command uses the ``--output`` and ``--query`` parameters to control the output and extract the contents of the ``loaContent`` structure. The final part of the command decodes the content using the ``base64`` utility, and sends the output to a PDF file.

.. code::

  aws directconnect describe-connection-loa --connection-id dxcon-fh6ayh1d --output text --query loa.loaContent|base64 --decode > myLoaCfa.pdf

**To describe your LOA-CFA for a connection using Windows**

The previous example requires the use of the ``base64`` utility to decode the output. On a Windows computer, you can use ``certutil`` instead. In the following example, the first command describes your LOA-CFA for connection ``dxcon-fh6ayh1d`` and uses the ``--output`` and ``--query`` parameters to control the output and extract the contents of the ``loaContent`` structure to a file called ``myLoaCfa.base64``. The second command uses the ``certutil`` utility to decode the file and send the output to a PDF file.

.. code::

  aws directconnect describe-connection-loa --connection-id dxcon-fh6ayh1d --output text --query loa.loaContent > myLoaCfa.base64 

.. code::

  certutil -decode myLoaCfa.base64 myLoaCfa.pdf
  
For more information about controlling AWS CLI output, see `Controlling Command Output from the AWS Command Line Interface <https://docs.aws.amazon.com/cli/latest/userguide/controlling-output.html>`_ in the *AWS Command Line Interface User Guide*.