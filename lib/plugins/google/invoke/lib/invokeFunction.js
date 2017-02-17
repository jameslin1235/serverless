'use strict';

module.exports = {
  invokeFunction() {
    const project = this.serverless.service.provider.project;
    const region = this.options.region;

    // retrieve the functions name (Google uses our handler property as the function name)
    if (!this.serverless.service.functions[this.options.function]) {
      const errorMessage = [
        `Function "${this.options.function}" not found. `,
        'Please check your "serverless.yml" file for the correct function name.',
      ].join('');
      throw new this.serverless.classes.Error(errorMessage);
    }

    const func = this.serverless.service.functions[this.options.function].handler;

    const params = {
      name: `projects/${project}/locations/${region}/functions/${func}`,
    };

    return this.provider.request(
      'cloudfunctions',
      'projects',
      'locations',
      'functions',
      'call',
      params
    )
      .then(() => this.provider.request('logging', 'entries', 'list', {
        filter: `Function execution ${func}`,
        orderBy: 'timestamp desc',
        resourceNames: [
          `projects/${project}`,
        ],
        // only show the last to results, because they are
        // the "started" and "took" logs for the function
        pageSize: 2,
      }))
      .then((logs) => {
        let log = {
          textPayload: `Right now there's not log data for function "${func}" available...`,
        };

        if (logs.entries.length) log = logs.entries;

        this.serverless.cli.log(JSON.stringify(log, null, 2));
      });
  },
};
