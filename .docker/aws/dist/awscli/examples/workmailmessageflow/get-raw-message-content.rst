**To get the raw content of an email message**

The following ``get-raw-message-content`` example gets the raw content of an in-transit email message and sends it to a text file named ``test``. ::

    aws workmailmessageflow get-raw-message-content \
        --message-id a1b2cd34-ef5g-6h7j-kl8m-npq9012345rs \
        test

Contents of file ``test`` after command runs::

    Subject: Hello World
    From: =?UTF-8?Q?marymajor_marymajor?= <marymajor@example.com>
    To: =?UTF-8?Q?mateojackson=40example=2Enet?= <mateojackson@example.net>
    Date: Thu, 7 Nov 2019 19:22:46 +0000
    Mime-Version: 1.0
    Content-Type: multipart/alternative; 
     boundary="=_EXAMPLE+"
    References: <mail.1ab23c45.5de6.7f890g123hj45678@storage.wm.amazon.com>
    X-Priority: 3 (Normal)
    X-Mailer: Amazon WorkMail
    Thread-Index: EXAMPLE
    Thread-Topic: Hello World
    Message-Id: <mail.1ab23c45.5de6.7f890g123hj45678@storage.wm.amazon.com>
    
    This is a multi-part message in MIME format. Your mail reader does not
    understand MIME message format.
    --=_EXAMPLE+
    Content-Type: text/plain; charset=UTF-8
    Content-Transfer-Encoding: 7bit
    
    hello world
    
    
    --=_EXAMPLE+
    Content-Type: text/html; charset=utf-8
    Content-Transfer-Encoding: quoted-printable
    
    <!DOCTYPE HTML><html>
    <head>
    <meta name=3D"Generator" content=3D"Amazon WorkMail v3.0-4510">
    <meta http-equiv=3D"Content-Type" content=3D"text/html; charset=3Dutf-8">=
    
    <title>testing</title>
    </head>
    <body>
    <p style=3D"margin: 0px; font-family: Arial, Tahoma, Helvetica, sans-seri=
    f; font-size: small;">hello world</p>
    </body>
    </html>
    --=_EXAMPLE+--

For more information, see `Retrieving Message Content with AWS Lambda <https://docs.aws.amazon.com/workmail/latest/adminguide/lambda-content.html>`__ in the *Amazon WorkMail Administrator Guide*.
