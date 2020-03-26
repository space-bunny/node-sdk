#!/bin/bash

if [ ! -f .env ]
then
  echo "Missing .env file"
  exit 0
fi

source .env

if [ -z "$NPM_USERNAME" ] || [ -z "$NPM_PASSWORD" ] || [ -z "$NPM_EMAIL" ]
then
  echo "Some credentials in .env file are empty"
  exit 0
fi

# build library
yarn build

# login to npm
npm-cli-login -u "$NPM_USERNAME" -p "$NPM_PASSWORD" -e "$NPM_EMAIL"

# pulbish
npm publish ./