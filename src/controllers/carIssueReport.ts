import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import CarIssueReport from "../models/CarIssueReport";


// -------------------------------------------------------
// CREATE an issue report
// -------------------------------------------------------
export const createIssueReport = async (req: Request, res: Response) => {
  try {
    const { carId, reportedById, description, severity, diagnosticPdfUrl } = req.body;

    if (!carId || !description) {
      return res
        .status(400)
        .json({ message: "carId and description are required." });
    }

    const repo = AppDataSource.getRepository(CarIssueReport);

    const report = repo.create({
      carId,
      reportedById: reportedById ?? null,
      description,
      severity: severity ?? "low",
      diagnosticPdfUrl: diagnosticPdfUrl ?? null,
    });

    const saved = await repo.save(report);
    return res.status(201).json(saved);
  } catch (error) {
    console.error("Error creating issue report:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// -------------------------------------------------------
// GET ALL issue reports
// -------------------------------------------------------
export const getAllIssueReports = async (req: Request, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(CarIssueReport);

    const issues = await repo.find({
      relations: ["car", "reportedBy", "resolvedBy"],
      order: { createdAt: "DESC" }
    });

    return res.json(issues);
  } catch (error) {
    console.error("Error fetching issue reports:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// -------------------------------------------------------
// GET ISSUE REPORTS for a specific car
// -------------------------------------------------------
export const getIssueReportsForCar = async (req: Request, res: Response) => {
  try {
    const { carId } = req.params;
    const repo = AppDataSource.getRepository(CarIssueReport);

    const issues = await repo.find({
      where: { carId },
      relations: ["reportedBy", "resolvedBy"],
      order: { createdAt: "DESC" }
    });

    return res.json(issues);
  } catch (error) {
    console.error("Error fetching reports for car:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// -------------------------------------------------------
// GET single issue report
// -------------------------------------------------------
export const getSingleIssueReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const repo = AppDataSource.getRepository(CarIssueReport);

    const issue = await repo.findOne({
      where: { id },
      relations: ["car", "reportedBy", "resolvedBy"]
    });

    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    return res.json(issue);
  } catch (error) {
    console.error("Error fetching single issue report:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getNewCarIssueReports = async (req: Request, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(CarIssueReport);

    const reports = await repo.find({
      where: { status: "open" }, // Only new reports
      relations: ["car", "reportedBy"], // Include car & reporter info
      order: { createdAt: "DESC" } // newest first
    });

    return res.status(200).json(reports);
  } catch (error) {
    console.error("Error fetching new car issue reports:", error);
    return res.status(500).json({ message: "Error fetching new car issue reports" });
  }
};

export const getNewCarIssueReportsByCar = async (req: Request, res: Response) => {
  try {
    const { carId } = req.params;

    const repo = AppDataSource.getRepository(CarIssueReport);

    const reports = await repo.find({
      where: { carId, status: "open" },
      relations: ["car", "reportedBy"],
      order: { createdAt: "DESC" }
    });

    return res.status(200).json(reports);
  } catch (error) {
    console.error("Error fetching car issue reports:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// -------------------------------------------------------
// UPDATE status / severity / description
// -------------------------------------------------------
export const updateIssueReportStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, severity, description, resolvedById } = req.body;

    const repo = AppDataSource.getRepository(CarIssueReport);

    const issue = await repo.findOne({ where: { id } });

    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    if (status) {
      issue.status = status;

      if (status === "resolved") {
        issue.resolvedById = resolvedById ?? null;
        issue.resolvedAt = new Date();
      }
    }

    if (severity) issue.severity = severity;
    if (description) issue.description = description;

    const updated = await repo.save(issue);
    return res.json(updated);
  } catch (error) {
    console.error("Error updating issue report:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// -------------------------------------------------------
// DELETE issue report
// -------------------------------------------------------
export const deleteIssueReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const repo = AppDataSource.getRepository(CarIssueReport);

    const issue = await repo.findOne({ where: { id } });

    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    await repo.remove(issue);
    return res.json({ message: "Issue report deleted." });
  } catch (error) {
    console.error("Error deleting issue report:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
