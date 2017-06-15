"use strict";
const GitHubApi = require("github");
const moment = require("moment");

const weekStart = moment().startOf("day").subtract(6, "month");

module.exports.singleUser = (event, context, callback) => {
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
    .then(filterRecentRepos)
    .then(cleanUpRepos)
    .then(repos => {
      const response = {
        statusCode: 200,
        body: JSON.stringify([...repos])
      };

      callback(null, response);
    });
};

// Helper Functions

function filterRecentRepos(repos) {
  return repos.data.filter(repo => {
    return moment(repo.updated_at).isAfter(weekStart);
  });
}

function cleanUpRepos(repos) {
  return repos.map(repo => {
    return {
      id: repo.id,
      name: repo.name,
      owner: {
        login: repo.owner.login,
        id: repo.owner.id
      },
      html_url: repo.html_url,
      updated_at: repo.updated_at
    };
  });
}
