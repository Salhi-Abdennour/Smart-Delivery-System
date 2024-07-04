const express = require("express");
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require('uuid');
const FUF = require("./../../utility/utilityFunctions.js");
const {
  signUpTypeValidation,
  fileUploadValidation,
  inputValidation,
  dbConflictCheck,
  userCreation,
  manipulationOfFealdsDetectorSingup
} = require("../../utility/middlewares.js")

const router = express.Router();

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../temp'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, JPG and PNG files are allowed.'));
    }
  },
  limits: { fileSize: 2500000 } // 2.5 MB
});

// Routes
router.get("/", (req, res) => {
  res.send("hey");
});


router.post("/",
  signUpTypeValidation,
  upload.fields([
    { name: 'recto', maxCount: 1 },
    { name: 'verso', maxCount: 1 }
  ]),
  fileUploadValidation,
  manipulationOfFealdsDetectorSingup,
  inputValidation,
  dbConflictCheck,
  userCreation,
  async (req, res) => {
    res.status(201).json({ message: "User created successfully!" });
  }
);


// Error handling middleware
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    res.status(400).json({ error: err.message });
  } else if (err.message === 'Invalid file type. Only JPEG, JPG and PNG files are allowed.') {
    res.status(415).json({ error: err.message });
  } else {
    console.error(err.message);
    res.status(500).json({ error: "An unexpected error occurred" });
  }
});



module.exports = router;
