#! /bin/sh

# Use ssh-keygen to create an RSA KEY

# -t rsa        RSA key type
# -b 2048       use 2048 bits for key
# -N ''         no passphrase
# -f jwt.key    output private key to jwt.key
ssh-keygen -t rsa -b 2048 -N '' -f jwt.key

# Can remove the rsa public key
rm jwt.key.pub

# Use openssl to generate PEM encoded pulic cert for RSA key
# rsa           RSA key type
# -in jwt.key   the input key
# -pubout       pls output the public
# -outform PEM  PEM encoded output (usually default)
# -out jwt.crt  store public crt in jwt.crt
openssl rsa -in jwt.key -pubout -outform PEM -out jwt.crt
