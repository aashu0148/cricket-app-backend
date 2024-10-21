import EmailSchema from "./emailSchema.js";
import Email from "#app/notifications/Email.js";
import LeagueSchema from "#app/leagues/leagueSchema.js";

import configs, { appName } from "#utils/configs.js";
import {
  createError,
  createResponse,
  getDateTimeFormatted,
} from "#utils/util.js";
import { emailTypesEnum } from "#utils/enums.js";

const emailClient = new Email();

// Get all sent emails from the database
const getAllEmails = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const emails = await EmailSchema.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalEmails = await EmailSchema.countDocuments();
    const totalPages = Math.ceil(totalEmails / limit);

    return createResponse(res, emails, 200, {
      page,
      limit,
      totalPages,
      total: totalEmails,
    });
  } catch (error) {
    console.error("Error fetching emails: ", error.message);
    return createError(
      res,
      error.message || "Failed to fetch emails",
      500,
      error
    );
  }
};

// Get a specific email by ID
const getEmailById = async (req, res) => {
  const emailId = req.params.id;

  try {
    const email = await EmailSchema.findById(emailId).lean();

    if (!email) {
      return createError(res, "Email not found", 404);
    }

    return createResponse(res, email, 200);
  } catch (error) {
    console.error("Error fetching email: ", error.message);
    return createError(
      res,
      error.message || "Failed to fetch email",
      500,
      error
    );
  }
};

async function sendDraftRoundTimeChangeReminderEmail({
  leagueId,
  oldStartDate,
  newStartDate,
}) {
  try {
    const league = await LeagueSchema.findById(leagueId).populate(
      "teams.owner"
    );
    if (!league)
      return console.error(
        "League not found to send draft round time update mail, leagueId:",
        leagueId
      );

    const leagueName = league.name;
    const dates = {
      old: oldStartDate || league.draftRound.startDate,
      new: newStartDate,
    };

    const subject = `Contest Draft Time Change: ${leagueName}`;
    const text = `Dear User,\n\nThe draft round for the contest ${leagueName} has been rescheduled. The previous time was ${getDateTimeFormatted(
      dates.old
    )}, and the new time is now ${getDateTimeFormatted(
      dates.new
    )}. Please make sure to adjust your plans accordingly.\n\nBest Regards,\n${appName} Team`;

    const html = `
      <p>Dear User,</p>
      <p>The draft round for the contest: <strong>${leagueName}</strong> has been rescheduled.</p>
      <p><strong>Old Time:</strong> ${getDateTimeFormatted(dates.old)}</p>
      <p><strong>New Time:</strong> ${getDateTimeFormatted(dates.new)}</p>
      <p>Please make sure to adjust your plans accordingly.</p>
      <p>Best Regards,</p>
      <p>${appName} Team</p>
    `;

    const users = league.teams.map((e) => ({
      userId: e.owner._id,
      email: e.owner.email,
    }));

    for (const user of users) {
      await emailClient.sendMail({
        type: emailTypesEnum.DRAFT_ROUND_TIME_UPDATE,
        sentToUserId: user.userId,
        to: user.email,
        subject,
        text,
        html,
        metadata: {
          leagueId,
          startDate: dates.new,
        },
      });
    }

    return true;
  } catch (error) {
    console.error("Error in sending draft round time change reminder: ", error);
    return false;
  }
}

async function sendDraftRoundReminderEmail({ leagueId }) {
  try {
    const league = await LeagueSchema.findById(leagueId).populate(
      "teams.owner"
    );
    if (!league)
      return console.error(
        "League not found to send draft round update, leagueId:",
        leagueId
      );

    const leagueName = league.name;
    const formattedStartDate = getDateTimeFormatted(
      league.draftRound.startDate
    );

    const subject = `Draft Round Reminder for ${leagueName}`;
    const text = `Hello,\n\nThis is a reminder that the draft round for the contest "${leagueName}" will start on ${formattedStartDate}.\n\nBest regards,\n${appName} Team`;
    const html = `
    <p>Hello,</p>
    <p>This is a reminder that the draft round for the contest <strong>"${leagueName}"</strong> will start on <strong>${formattedStartDate}</strong>.</p>
    <p>Best regards,<br>${appName} Team</p>
    `;

    const users = league.teams.map((e) => ({
      userId: e.owner._id,
      email: e.owner.email,
    }));
    for (const user of users) {
      const alreadySentEmail = await EmailSchema.findOne({
        "metadata.leagueId": leagueId,
        sentTo: user.userId,
        type: emailTypesEnum.DRAFT_ROUND_REMINDER,
      });

      if (alreadySentEmail) continue; // already sent email

      await emailClient.sendMail({
        type: emailTypesEnum.DRAFT_ROUND_REMINDER,
        sentToUserId: user.userId,
        to: user.email,
        subject,
        text,
        html,
        metadata: {
          leagueId,
        },
      });
    }

    return true;
  } catch (error) {
    console.error("Error in sending draft round reminder: ", error);
    return false;
  }
}

async function sendTournamentResultsEmail({ tournamentId }) {
  try {
    const leagues = await LeagueSchema.find({
      tournament: tournamentId,
    }).populate("teams.owner");
    if (!leagues.length) return;

    for (const league of leagues) {
      const leagueName = league.name;
      const users = league.teams.map((e) => ({
        userId: e.owner._id,
        email: e.owner.email,
        name: e.owner.name,
      }));

      for (const user of users) {
        const alreadySentEmail = await EmailSchema.findOne({
          "metadata.leagueId": league._id.toString(),
          sentTo: user.userId,
          type: emailTypesEnum.TOURNAMENT_RESULTS,
        });
        if (alreadySentEmail) continue; // already sent email

        const subject = `🏆 Contests Results for ${leagueName} Are Now Available!`;
        const resultsLink = `${configs.FRONTEND_URL}/tournaments/${tournamentId}/contests/${league._id}`;

        const text = `
        Dear ${user.name},
  
        We want to inform you that the results for the ${leagueName} have been officially declared!
  
        Click the link below to view the full results:
        ${resultsLink}
  
        Thank you for participating in the contest and showing your incredible skills.
  
        Best Regards,
        Team ${appName}
      `;
        const html = `
        <p>Dear ${user.name},</p>
        <p>We want to inform you that the results for the <strong>${leagueName}</strong> have been officially declared!</p>
        <p>Click the link below to view the full results:</p>
        <p><a href="${resultsLink}">View Contest Results</a></p>
        <p>Thank you for participating in the contest and showing your incredible skills.</p>
        <p>Best Regards,</p>
        <p>Team ${appName}</p>
      `;

        await emailClient.sendMail({
          type: emailTypesEnum.TOURNAMENT_RESULTS,
          sentToUserId: user.userId,
          to: user.email,
          subject,
          text,
          html,
          metadata: {
            leagueId: league._id,
          },
        });
      }
    }
    return true;
  } catch (error) {
    console.error("Error in sending draft round reminder: ", error);
    return false;
  }
}

export {
  sendDraftRoundReminderEmail,
  sendDraftRoundTimeChangeReminderEmail,
  getAllEmails,
  getEmailById,
  sendTournamentResultsEmail,
};
