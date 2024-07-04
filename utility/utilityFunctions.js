const crypto = require('crypto');
const bcrypt = require('bcrypt');
const parser = require("ua-parser-js");
const fs = require("fs").promises;
const path = require("path");


// Function to open a connection to a SQLite database
function openDatabase(sqlite3, databasePath, mod) {
    // Create a new SQLite database connection
    let db = new sqlite3.Database(databasePath, mod, (err) => {
        if (err) {
            console.error(err.message); // Log any errors that occur during the connection
            return res.status(500)
        } else {
            console.log('Connected to the database successfully!'); // Log a success message if the connection is successful
        }
    });

    return db; // Return the database connection
}

// Function to close an existing SQLite database connection
function closeDatabase(db) {
    // Close the database connection
    db.close((err) => {
        if (err) {
            console.error(err.message); // Log any errors that occur during the close operation
        } else {
            console.log('Database closed successfully.'); // Log a success message if the connection is closed successfully
        }
    });
}
function emailValidator(email) {
  const regex = /^(?!.*\.\.)[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return { emailIsValid: regex.test(email) || email == null };
}

function userNameValidator(username) {
  const regex = /^(?=.*\S.{3,})[a-zA-Z0-9]+(?: [a-zA-Z0-9]+)*$/;
  return { usernameIsValid: regex.test(username) };
}

function phoneNumberAndCinValidator(phoneNumberOrNcin, type) {
  const regex = /^\d{8}$/;
  return { [`${type}IsValid`]: regex.test(phoneNumberOrNcin) };
}

function passwordValidator(passwd) {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\\-_=+{};:,<.>]).{8,}$/;
  return { passwdIsValid: regex.test(passwd) };
}

function uniqueIdentifier(cinNumber) {
  const hash = crypto.createHash('sha256').update(cinNumber).digest('hex');
  return parseInt(hash.slice(0, 8), 16);
}

function userAgentGenerator(cinNumber, userAgent) {
  const hashedNumber = uniqueIdentifier(cinNumber);
  const uaResult = parser(userAgent);

  return `Moderator/${hashedNumber}/` +
    `${uaResult.os.name}${uaResult.os.version}/` +
    `CPU:${uaResult.cpu.architecture}/` +
    `${uaResult.engine.name}:${uaResult.engine.version}/` +
    `${uaResult.browser.name}:${uaResult.browser.version}/` +
    `${uaResult.browser.major}`;
}

function resolveExtension(filename) {
  return path.extname(filename).toLowerCase();
}

async function handleImageUpload(req, fileKey) {
  try {
    const file = req.files[fileKey][0];
    const validExtensions = ['.png', '.jpeg', '.jpg'];
    const fileExtension = resolveExtension(file.originalname);

    if (!validExtensions.includes(fileExtension)) {
      throw new Error("Invalid file extension");
    }

    return { [`cin${fileKey.charAt(0).toUpperCase() + fileKey.slice(1)}IsValid`]: true };
  } catch (err) {
    console.error('Validation error:', err.message);
    await deleteFileFromTemp(req.files[fileKey][0].path);
    return { [`cin${fileKey.charAt(0).toUpperCase() + fileKey.slice(1)}IsValid`]: false };
  }
}

function customRespondBasedOnInput(array) {
  let response = {};
  let badRequestFound = false;

  array.forEach(element => {
    response = { ...response, ...element };
    if (!Object.values(element)[0] && !badRequestFound) {
      badRequestFound = true;
    }
  });

  return { badRequestFound, response };
}

function generateSalt(length) {
  return crypto.randomBytes(length).toString('base64');
}

async function hashPassword(password, salt) {
  return bcrypt.hash(password + salt, 10);
}

async function readFileToBuffer(filePath) {
  return fs.readFile(filePath);
}

async function deleteFileFromTemp(filePath) {
  try {
    await fs.unlink(filePath);
    console.log('File deleted successfully');
  } catch (err) {
    console.error('Error deleting file:', err);
  }
}

function postRequestTypeValidation(arr, signUpType) {
  return arr.includes(signUpType);
}


async function findConflicts(query, params, db) {
    try {
        const row = await new Promise((resolve, reject) => {
            db.get(query, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
        return row;
    } catch (err) {
        console.error("Error in findConflicts:", err);
        throw err; // Re-throw the error to handle it where findConflicts is called
    }
}

async function areFilesIdentical(file1Path, file2Path) {
    try {
      // Read both files into buffers
      const rectoBuffer = await fs.readFile(file1Path);
      const versoBuffer = await fs.readFile(file2Path);
  
      // Compare file contents
        if(rectoBuffer.equals(versoBuffer)){
            await deleteFileFromTemp(file1Path);
            await deleteFileFromTemp(file2Path);
        }


      return {"cinRecto,cinVerso not identical":!rectoBuffer.equals(versoBuffer)}
    } catch (err) {
        console.error("Error reading files or comparing:", err);
        throw err; // Rethrow the error for handling elsewhere
    }

  }

async function cleanUp(req){
  try {
    // Execute cleanup even if there was an error in previous middleware
    if (req.files && req.files["recto"] && req.files["recto"][0].path) {
      await deleteFileFromTemp(req.files["recto"][0].path);
    }
    if (req.files && req.files["verso"] && req.files["verso"][0].path) {
      await deleteFileFromTemp(req.files["verso"][0].path);
    }
  } catch (err) {
    console.error("Error cleaning up files:", err.message);
    // Handle cleanup error gracefully, if needed
  }
}


module.exports = {
  openDatabase,
  closeDatabase,
  emailValidator,
  passwordValidator,
  userNameValidator,
  phoneNumberAndCinValidator,
  userAgentGenerator,
  resolveExtension,
  uniqueIdentifier,
  handleImageUpload,
  customRespondBasedOnInput,
  generateSalt,
  hashPassword,
  readFileToBuffer,
  deleteFileFromTemp,
  postRequestTypeValidation,
  findConflicts,
  areFilesIdentical,
  cleanUp
};
