const FUF = require("./utilityFunctions.js");
const sqlite3 = require('sqlite3');


// Middlewares
const signUpTypeValidation = async (req, res, next) => {
    const signUpType = req.baseUrl.slice(1, req.baseUrl.indexOf("-"));
    req.signUpType = signUpType;
    if (!FUF.postRequestTypeValidation(["moderateurs", "livreur", "expediteur"], signUpType)) {
        await FUF.cleanUp(req)
        return res.status(400).json({ error: "Invalid signup type" });
    }
    next();
  };
  
const fileUploadValidation = async (req, res, next) => {
    if (!req.files || !req.files["recto"] || !req.files["verso"]) {
        await FUF.cleanUp(req);
        return res.status(400).json({ error: "Recto and Verso images are required" });
    }
    next();
  };
  
const inputValidation = async (req, res, next) => {
    const { username, numTf, email, passwd, nCin } = req.body;
    const validations = [
        await FUF.handleImageUpload(req, "recto"),
        await FUF.handleImageUpload(req, "verso"),
        await FUF.areFilesIdentical(req.files["recto"][0].path, req.files["verso"][0].path),
        FUF.userNameValidator(username.trim()),
        FUF.phoneNumberAndCinValidator(numTf, "phoneNumber"),
        FUF.emailValidator(email),
        FUF.passwordValidator(passwd),
        FUF.phoneNumberAndCinValidator(nCin, "nCin")
    ];
    const requestAnalysis = FUF.customRespondBasedOnInput(validations);
    if (requestAnalysis.badRequestFound) {
        await FUF.cleanUp(req)
        return res.status(400).json(requestAnalysis.response);
    }
    next();
  };
  
const dbConflictCheck = async (req, res, next) => {
    let db;
    try {
        db = FUF.openDatabase(sqlite3, process.env.DATABASE_PATH, sqlite3.OPEN_READWRITE);
        req.db = db;
    }catch (err) {
        await FUF.cleanUp(req)
        return res.status(500).json({ error: "Failed to connect to the database!" });
    }
  
    const { numTf, email, nCin } = req.body;
    const signUpType = req.signUpType;
    const checkArrayQueries = [
        { sql: `SELECT 1 FROM ${signUpType} WHERE n_cin = ?;`, params: [nCin] },
        { sql: `SELECT 1 FROM ${signUpType} WHERE num_tf = ?;`, params: [numTf] },
        { sql: `SELECT 1 FROM ${signUpType} WHERE email = ?;`, params: [email] }
    ];
  
    let conflictArrayErrors = [];
    let row;
  
    for(let i = 0; i < checkArrayQueries.length; i++) {
        try {
            row = await FUF.findConflicts(checkArrayQueries[i].sql, checkArrayQueries[i].params, db);
            if (row) {
                switch (i) {
                    case 0:
                    conflictArrayErrors.push({ err: "Le numéro de carte d'identité nationale existe" });
                    break;
                    case 1:
                    conflictArrayErrors.push({ err: "Le numéro de téléphone existe" });
                    break;
                    case 2:
                    conflictArrayErrors.push({ err: "L'adresse email existe" });
                    break;
                }
            }
        }catch (err) {
        await FUF.cleanUp(req);     
        return res.status(500).json({ error: "Internal server error!" });
      }
    }
  
    if (conflictArrayErrors.length > 0) {
        await FUF.cleanUp(req)
        return res.status(409).json(conflictArrayErrors);
    }
    next();
};
  
const userCreation = async (req, res, next) => {
    const { username, numTf, email, passwd, nCin } = req.body;
    const signUpType = req.signUpType;
    const db = req.db;
  
    const salt = FUF.generateSalt(16);
    const hashedPaswd = await FUF.hashPassword(passwd, salt);
  
    const query = `INSERT INTO ${signUpType}(nom_prenom,num_tf,email,passwd,n_cin,cin_recto,cin_verso${signUpType == "moderateurs" ? ",browser_user_agent" : signUpType === "livreur" ? ",status" : ""},verifie,salt) VALUES(?,?,?,?,?,?,?,${signUpType !== "expediteur" ? "?," : ""}?,?)`;
  
    const baseArray = [
        username,
        numTf,
        email,
        hashedPaswd,
        nCin,
        await FUF.readFileToBuffer(req.files.recto[0].path),
        await FUF.readFileToBuffer(req.files.verso[0].path)
    ];
  
    const dynamicArray = signUpType === "moderateurs"
        ? [...baseArray, FUF.userAgentGenerator(nCin, req.headers["user-agent"]), 0, salt]
        : signUpType === "livreur"
        ? [...baseArray, "undefined", 0, salt]
        : [...baseArray, 0, salt];
  
    db.run(query, dynamicArray, async (err) => {
        if (err) {
            await FUF.cleanUp(req);
            console.error(err.message);
            return res.status(500).json({ error: "Internal server error!" });
        }
    });
  
    try {
        FUF.closeDatabase(db);
    }catch (err) {
        await FUF.cleanUp(req)      
        return res.status(500).json({ error: "Failed to connect to the database!" });
    }
    await FUF.cleanUp(req)
    next();
  };

const manipulationOfFealdsDetectorLogin = (req,res,next)=>{
    if (Object.keys(req.body).length !== 2 || (!req.body["email"] && !req.body["numTf"]) || !req.body["passwd"]) {
        return res.status(400).json({ error: "Manipulation in the fields occurred!" });
    }
    next()
}

const manipulationOfFealdsDetectorSingup = async (req,res,next)=>{
    const bodyKeys = Object.keys(req.body);
    const requiredFields = ["username", "numTf", "passwd", "nCin"];

    // Check if all required fields are present
    const allRequiredFieldsPresent = requiredFields.every(field => req.body[field]);
    // Check if there are exactly 4 or 5 fields in total
    if (bodyKeys.length >= 4 && bodyKeys.length <= 5) {
        // If not all required fields are present or email is missing (optional), return error
        if (!allRequiredFieldsPresent || (bodyKeys.length === 5 && !req.body["email"])) {
            await FUF.cleanUp(req);
            return res.status(400).json({ error: "Manipulation in the fields occurred!" });
        }
    } else {
        // If number of fields is not between 4 and 5, return error
        await FUF.cleanUp(req);
        return res.status(400).json({ error: "Manipulation in the fields occurred!" });
    }
    next();
}

    



  module.exports = {
    signUpTypeValidation,
    fileUploadValidation,
    inputValidation,
    dbConflictCheck,
    userCreation,
    manipulationOfFealdsDetectorLogin,
    manipulationOfFealdsDetectorSingup,
  }