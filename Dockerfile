FROM python:3.14

RUN apt-get update -y \
    \
    && curl -fsSL https://deb.nodesource.com/setup_26.x | bash - \
    && apt-get install -y nodejs \
    \
    && git clone https://github.com/tfutils/tfenv.git ~/.tfenv \
    && echo 'export PATH="$HOME/.tfenv/bin:$PATH"' >> ~/.bash_profile \
    && ln -s ~/.tfenv/bin/* /usr/local/bin \
    \
    && pip3 install boto3 python-lambda-local \
    && pip3 install flake8 flake8-use-fstring pep8-naming \
    && pip3 install coverage python-dotenv

WORKDIR /app
COPY . /app

# RUN cd code/packages && . ./install.sh