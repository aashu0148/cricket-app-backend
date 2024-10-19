import Bree from "bree";

function setUpCronJobs() {
  const bree = new Bree({
    jobs: [
      {
        name: "Send draft round reminders",
        path: "./jobs/sendDraftRoundReminders.js", // Path to draft reminders job
        cron: "*/30 * * * *", // Run every 30 minutes
        timezone: "Asia/Kolkata", // Indian timezone
      },
      {
        name: "Check tournament match data",
        path: "./jobs/checkMatchResults.js",
        cron: "0 */12 * * *", // Run every 12 hours
        timezone: "Asia/Kolkata", // Indian timezone
      },
    ],
  });

  bree.start();
  console.log(`⚒️  Jobs initialized with Bree`);
}

export default setUpCronJobs;
