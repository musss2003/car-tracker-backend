import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import authenticate from "../middlewares/verifyJWT";

const router = express.Router();

router.use(authenticate);

// Configure multer for private storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../../private_uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const upload = multer({ storage });

// Upload route (requires authentication)
router.post("/upload", upload.single("document"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: "No file uploaded" });
    return;
  }

  // Store reference in DB if you want (e.g. req.file.filename)
  res.json({ message: "File uploaded successfully", filename: req.file.filename });
});

// Download route (secure access)
router.get("/documents/:filename", (req, res) => {
  const filePath = path.join(__dirname, "../../private_uploads", req.params.filename);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ message: "File not found" });
    return;
  }

  res.download(filePath); // Forces secure download
});

export default router;
