import EmailSchema from "./emailSchema.js";
import { createError, createResponse } from "#utils/util.js";

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

export { sendEmail, getAllEmails, getEmailById };
