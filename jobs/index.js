import Bree from "bree";

function setUpCronJobs() {
  const bree = new Bree({
    jobs: [
      {
        name: "Send draft round reminders",
        path: "./jobs/sendDraftRoundReminders.js", // this path is relative to the root of the project
        cron: "*/30 * * * *", // Run every 30 minutes
        timezone: "Asia/Kolkata", // Use Indian timezone
      },
    ],
  });

  bree.start();
  console.log(`⚒️  Jobs initialized with Bree`);
}

export default setUpCronJobs;
