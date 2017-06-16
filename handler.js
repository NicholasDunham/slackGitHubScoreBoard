"use strict";
const GitHubApi = require("github");
const moment = require("moment");
const qs = require("querystring");
const userTable = require("./userTable");

const github = new GitHubApi();
github.authenticate({
  type: "oauth",
  token: process.env.GITHUB_TOKEN
});

const weekStart = moment().startOf("isoWeek");
const helpText =
  "To retrieve your own statistics, type `/scoreboard`.\nTo retrieve another user's statistics, use an @mention after the command, like this: `/scoreboard @nmdnhm`.\nNote that I can only handle one @mention at a time (for now).";
const errorText =
  "Sorry, either I didn't understand your command or I can't find that user. Please try again, or type `/scoreboard help` for options.";

module.exports.singleUser = (event, context, callback) => {
  const params = qs.parse(event.body);
  let slackName = params.text || params.user_name;

  lookup(slackName)
    .then(filterRecentEvents)
    .then(countEvents)
    .then(score => {
      return JSON.stringify({
        response_type: "in_channel",
        text: `So far this week, @${slackName} has earned ${score} points for contributions on GitHub.`
      });
    })
    .catch(msg => {
      return JSON.stringify({
        text: msg
      });
    })
    .then(msg => {
      const response = {
        statusCode: 200,
        body: msg
      };
      callback(null, response);
    });
};

// Helper Functions

function lookup(slackName) {
  if (slackName === "help") {
    return Promise.reject(helpText);
  }

  slackName = slackName.replace(/^@/, "");

  const gitHubName = userTable[slackName];

  if (!gitHubName) {
    return Promise.reject(errorText);
  } else {
    return github.activity.getEventsForUser({ username: gitHubName });
  }
}

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
