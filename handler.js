"use strict";
const GitHubApi = require("github");
const moment = require("moment");

module.exports.singleUser = (event, context, callback) => {
  const weekStart = moment().startOf("day").subtract(1, "week");

  const github = new GitHubApi();
  github.authenticate({
    type: "oauth",
    token: process.env.GITHUB_TOKEN
  });

  github.repos
    .getForUser({
      username: "nicholasdunham",
      type: "all",
      sort: "updated",
      direction: "desc",
      per_page: 100
    })
    .then(repos => {
      const recent = repos.data.filter(repo =>
        moment(repo.updated_at).isAfter(weekStart)
      );
      const response = {
        statusCode: 200,
        body: JSON.stringify(recent)
      };

      callback(null, response);
    });
};
