"use strict";
const GitHubApi = require("github");
const moment = require("moment");

const github = new GitHubApi();
github.authenticate({
  type: "oauth",
  token: process.env.GITHUB_TOKEN
});

const weekStart = moment().startOf("day").subtract(1, "week");

module.exports.singleUser = (event, context, callback) => {
  github.activity
    .getEventsForUser({
      username: "nicholasdunham"
    })
    .then(filterRecentEvents)
    .then(countEvents)
    .then(finalScore => {
      // const response = {
      //   statusCode: 200,
      //   body: JSON.stringify({
      //     text: `Your score: ${finalScore}`
      //   })
      // };

      const response = {
        statusCode: 200,
        body: JSON.stringify({
          text: `Your GitHub score for the past seven days: ${finalScore}`
        })
      };

      callback(null, response);
    });
};

// Helper Functions

function filterRecentEvents(events) {
  return events.data.filter(event => {
    return moment(event.created_at).isAfter(weekStart);
  });
}

function countEvents(events) {
  return events.reduce((acc, event) => {
    if (event.type === "PushEvent") {
      return event.payload.commits.length + acc;
    }

    return acc + 1;
  }, 0);
}
