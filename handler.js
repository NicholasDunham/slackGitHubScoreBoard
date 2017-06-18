"use strict";
const GitHubApi = require("github");
const moment = require("moment");
const momentTz = require("moment-timezone");
const qs = require("querystring");
const userTable = require("./userTable");
const rp = require("request-promise");

const github = new GitHubApi();
github.authenticate({
  type: "oauth",
  token: process.env.GITHUB_TOKEN
});

const helpText = `To retrieve your own statistics, type \`/scoreboard\`.
To retrieve another user's statistics, use an @mention after the command, like this:
\`/scoreboard @nmdnhm\`
Note that I can only handle one @mention at a time (for now).`;
const errorText = `Sorry, either I didn't understand your command or I can't find that user.
Please try again, or type \`/scoreboard help\` for options.`;

let startTime;
let endTime;

module.exports.slashCommand = (event, context, callback) => {
  const params = qs.parse(event.body);
  let slackName = params.text || params.user_name;
  startTime = moment().tz("America/Los_Angeles").startOf("isoWeek");
  endTime = moment();

  userScore(slackName)
    .then(result => {
      return JSON.stringify({
        response_type: "in_channel",
        text: `So far this week, ${result.user} has earned ${result.score} points for public contributions on GitHub.`
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

module.exports.cronCommand = (event, context) => {
  const usernames = Object.keys(userTable);
  const now = momentTz().tz("America/Los_Angeles");
  startTime = moment(now).subtract(1, "day").startOf("isoWeek");
  endTime = moment(startTime).endOf("isoWeek");
  console.log(startTime);
  console.log(endTime);

  Promise.all(usernames.map(userScore))
    .then(weeklyMessage)
    .then(msg => {
      return {
        method: "POST",
        uri: process.env.SLACK_WEBHOOK_URL,
        body: {
          text: msg
        },
        json: true
      };
    })
    .then(rp)
    .catch(msg => {
      console.log(msg);
    });
};

// Helper Functions

function userScore(slackName) {
  return getActivity(slackName)
    .then(filterRecentEvents)
    .then(countEvents)
    .then(score => {
      return {
        user: slackName,
        score: score
      };
    });
}

function getActivity(slackName) {
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
    return moment(event.created_at).isBetween(startTime, endTime);
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

function weeklyMessage(scoreArray) {
  scoreArray.sort((a, b) => b.score - a.score);

  return `*Weekly GitHub Activity Report*

The CH3 members with the most public GitHub activity for the week beginning ${startTime.format(
    "MMMM D, YYYY"
  )} were:
1. @${scoreArray[0].user} (${scoreArray[0].score} points)
2. @${scoreArray[1].user} (${scoreArray[1].score} points)
3. @${scoreArray[2].user} (${scoreArray[2].score} points)`;
}
