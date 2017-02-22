'use strict';

const fs = require('fs');

const BbPromise = require('bluebird');
const _ = require('lodash');
const google = require('googleapis');

const constants = {
  providerName: 'google',
};

class GoogleProvider {
  static getProviderName() {
    return constants.providerName;
  }

  constructor(serverless) {
    this.serverless = serverless;
    this.provider = this; // only load plugin in a Google service context
    this.serverless.setProvider(constants.providerName, this);

    this.sdk = {
      deploymentmanager: google.deploymentmanager('v2'),
      storage: google.storage('v1'),
      logging: google.logging('v2'),
      // the following is just a dummy assignment and should be updated
      // once the official API is available
      cloudfunctions: null,
    };
  }

  request() {
    // grab necessary stuff from arguments array
    const lastArg = arguments[Object.keys(arguments).pop()];
    const hasParams = (typeof lastArg === 'object');
    const filArgs = _.filter(arguments, (v) => typeof v === 'string');
    const params = hasParams ? lastArg : {};

    return new BbPromise((resolve, reject) => {
      const service = filArgs[0];
      this.isServiceSupported(this.sdk, service);

      const authClient = this.getAuthClient();
      const discoveryURL = 'https://cloudfunctions.googleapis.com/$discovery/rest?version=v1beta2';

      google.discoverAPI(discoveryURL, (discoveryError, cloudfunctions) => {
        if (discoveryError) reject(new this.serverless.classes.Error(discoveryError));
        authClient.authorize(() => {
          const requestParams = { auth: authClient };

          // merge the params from the request call into the base functionParams
          _.merge(requestParams, params);

          // use beta API if a call to the Cloud Functions service is done
          if (service === 'cloudfunctions') {
            filArgs.slice(1, filArgs.length)
              .reduce((p, c) => p[c], cloudfunctions)(requestParams, (error, response) => {
                if (error) reject(new this.serverless.classes.Error(error));
                return resolve(response);
              });
          } else {
            // support for API calls with arbitraty deepness
            filArgs.reduce((p, c) => p[c], this.sdk)(requestParams, (error, response) => {
              if (error) reject(new this.serverless.classes.Error(error));
              return resolve(response);
            });
          }
        });
      });
    });
  }

  getAuthClient() {
    const keyFileContent = fs.readFileSync(this.serverless.service.provider.credentials).toString();
    const key = JSON.parse(keyFileContent);

    return new google.auth.JWT(
      key.client_email,
      null,
      key.private_key,
      ['https://www.googleapis.com/auth/cloud-platform'],
      null
    );
  }

  isServiceSupported(sdk, service) {
    if (!Object.keys(sdk).includes(service)) {
      const errorMessage = [
        `Unsupported service API "${service}". `,
        `Supported service APIs are ${Object.keys(sdk).join(', ')}`,
      ].join('');

      throw new this.serverless.classes.Error(errorMessage);
    }
  }
}

module.exports = GoogleProvider;
