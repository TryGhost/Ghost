FROM ubuntu:13.10
MAINTAINER Johannes 'fish' Ziemke <fish@docker.com>

RUN apt-get update && apt-get -y -q upgrade && apt-get -y -q install software-properties-common

RUN apt-get -y -q install python-software-properties python g++ make && \
    add-apt-repository ppa:chris-lea/node.js && \
    apt-get update

RUN apt-get -y -q install nodejs ruby python python-pygments curl git

RUN curl https://phantomjs.googlecode.com/files/phantomjs-1.9.2-linux-x86_64.tar.bz2 | \
    tar -C /usr/local -xjf - && ln -sf ../phantomjs-1.9.2-linux-x86_64/bin/phantomjs /usr/local/bin/

RUN git clone git://github.com/n1k0/casperjs.git /usr/local/casperjs && \
    ln -sf ../casperjs/bin/casperjs /usr/local/bin

WORKDIR /ghost
EXPOSE 8080
ENTRYPOINT [ "./run.sh" ]
CMD [ "start" ]

ADD . /ghost
RUN git submodule update --init && gem install bundler && bundle install && \
    npm install -g grunt-cli && npm install && grunt init && \
    cp config.docker.js config.js

RUN printf '#!/bin/sh\nDB_HOST=$(echo $DB_PORT | sed "s|^tcp://||;s/:.*//") exec npm $@' > \
    run.sh && chmod a+x run.sh

ENV NODE_ENV production
