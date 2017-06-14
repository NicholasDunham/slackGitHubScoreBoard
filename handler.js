"use strict";
const GitHubApi = require("github");
const moment = require("moment");

module.exports.hello = (event, context, callback) => {
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: process.env.GITHUB_USERNAME,
      input: event
    })
  };

  callback(null, response);

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // callback(null, { message: 'Go Serverless v1.0! Your function executed successfully!', event });
};

module.exports.singleUser = (event, context, callback) => {
  const weekStart = moment().startOf("day").subtract(1, "week");

  const github = new GitHubApi();
  github.authenticate({
    type: "oauth",
    token: process.env.GITHUB_TOKEN
  });

  github.activity
    .getEventsForUser({
      username: "nicholasdunham"
    })
    .then(events => {
      return events.data.filter(event =>
        moment(event.created_at).isAfter(weekStart)
      );
    })
    .then(events => {
      const response = {
        statusCode: 200,
        body: JSON.stringify(events)
      };

      callback(null, response);
    });
};
