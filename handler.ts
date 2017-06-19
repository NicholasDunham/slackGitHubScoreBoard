import * as GitHubApi from "github";
import * as moment from "moment";
import * as momentTz from "moment-timezone";
import * as qs from "querystring";
import * as rp from "request-promise";
import userTable from "./userTable";
import { Handler, Callback } from "aws-lambda";
import { GitHubResponse, GitHubEvent, UserScore } from "./types";

const github = new GitHubApi();
github.authenticate({
  type: "oauth",
  token: process.env.GITHUB_TOKEN
});

const helpText =
  "To retrieve your own statistics, type `/scoreboard`.\n" +
  "To retrieve another user's statistics, use an @mention after the " +
  "command, like this: `/scoreboard @nmdnhm`\n" +
  "Note that I can only handle one @mention at a time (for now).";
const errorText =
  "Sorry, either I didn't understand your command or I can't find that user. " +
  "Please try again, or type `/scoreboard help` for options.";

let startTime: moment.Moment;
let endTime: moment.Moment;

let slashCommand: Handler;
slashCommand = (event, context, callback: Callback) => {
  const params = qs.parse(event.body);
  if (params.token !== process.env.SLACK_TOKEN) {
    return callback(undefined, {
      statusCode: 401,
      body: JSON.stringify("You are not authorized to access this resource.")
    });
  }

  let slackName: string | undefined = params.text || params.user_name;
  startTime = moment().tz("America/Los_Angeles").startOf("isoWeek");
  endTime = moment();

  userScore(slackName)
    .then(result => {
      return JSON.stringify({
        response_type: "in_channel",
        text:
          `So far this week, ${result.user} has earned ${result.score} ` +
            `${result.score === 1 ? "point" : "points"} ` +
            `for public contributions on GitHub.`
      });
    })
    .catch((err: string) => {
      return JSON.stringify({
        text: err
      });
    })
    .then(body => {
      const response = {
        statusCode: 200,
        body
      };
      return callback(undefined, response);
    });
};

let cronCommand: Handler;
cronCommand = (event, context) => {
  const usernames = Object.keys(userTable);
  const now = momentTz().tz("America/Los_Angeles");
  startTime = moment(now).subtract(1, "day").startOf("isoWeek");
  endTime = moment(startTime).endOf("isoWeek");

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

function userScore(slackName: string | undefined): Promise<UserScore> {
  if (!slackName) {
    return Promise.reject(errorText);
  }

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

function getActivity(slackName: string): Promise<GitHubResponse> {
  if (!slackName) {
    return Promise.reject(errorText);
  } else if (slackName === "help") {
    return Promise.reject(helpText);
  }

  slackName = slackName.replace(/^@/, "");
  const gitHubName: string | undefined = userTable[slackName];

  if (!gitHubName) {
    return Promise.reject(errorText);
  } else {
    return github.activity.getEventsForUser({ username: gitHubName });
  }
}

function filterRecentEvents(events: GitHubResponse) {
  return events.data.filter(event => {
    return moment(event.created_at).isBetween(startTime, endTime);
  });
}

function countEvents(events: Array<GitHubEvent>): number {
  return events.reduce((acc, event) => {
    if (event.type === "PushEvent") {
      return event.payload.distinct_size + acc;
    }
    return acc + 1;
  }, 0);
}

function weeklyMessage(scoreArray: Array<UserScore>): string {
  scoreArray.sort((a, b) => b.score - a.score);

  return `*Weekly GitHub Activity Report*

The CH3 members with the most public GitHub activity for the week beginning ${startTime.format(
    "MMMM D, YYYY"
  )} were:
1. @${scoreArray[0].user} (${scoreArray[0].score} points)
2. @${scoreArray[1].user} (${scoreArray[1].score} points)
3. @${scoreArray[2].user} (${scoreArray[2].score} points)`;
}

export { slashCommand, cronCommand };
