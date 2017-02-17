'use strict';

const BbPromise = require('bluebird');
const invokeFunction = require('./lib/invokeFunction');
const utils = require('../shared/utils');

class GoogleInvoke {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('google');

    Object.assign(
      this,
      utils,
      invokeFunction
    );

    this.hooks = {
      'before:invoke:invoke': () => BbPromise.bind(this)
        .then(this.validate)
        .then(this.setDefaults),

      'invoke:invoke': () => BbPromise.bind(this)
        .then(this.invokeFunction),
    };
  }
}

module.exports = GoogleInvoke;
