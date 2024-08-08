const FUF = require("./utilityFunctions.js");
const sqlite3 = require('sqlite3');
const jwt = require("jsonwebtoken");


// Middlewares
const signUpLoginTypeValidation = async (req, res, next) => {
    const signUpLoginType = req.baseUrl.slice(1, req.baseUrl.indexOf("-"));
    req.signUpLoginType = signUpLoginType;
    if (!FUF.postRequestTypeValidation(["moderateurs", "livreur", "expediteur"], signUpLoginType)) {
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
    const { username, numTf, email, passwd, nCin, taxId } = req.body;
    const validations = [
        await FUF.handleImageUpload(req, "recto"),
        await FUF.handleImageUpload(req, "verso"),
        await FUF.areFilesIdentical(req.files["recto"][0].path, req.files["verso"][0].path),
        FUF.userNameValidator(username.trim()),
        FUF.phoneNumberAndCinValidator(numTf, "phoneNumber"),
        FUF.emailValidator(email),
        FUF.taxIdValidator(taxId),
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

  
const inputValidationForLogin = async (req, res, next) => {
    const methodOfLogin = req.body.numTf ? "numTf" : "email";
    if(methodOfLogin == "numTf"){
        const { numTf , passwd} = req.body;
        const validations = [
            FUF.phoneNumberAndCinValidator(numTf, "phoneNumber"),
            FUF.passwordValidator(passwd),
        ];
        const requestAnalysis = FUF.customRespondBasedOnInput(validations);
        if (requestAnalysis.badRequestFound) {
            await FUF.cleanUp(req)
            return res.status(400).json(requestAnalysis.response);
        }
    }else{
        const { email , passwd} = req.body;
        const validations = [
            FUF.emailValidator(email),
            FUF.passwordValidator(passwd),
        ];
        const requestAnalysis = FUF.customRespondBasedOnInput(validations);
        if (requestAnalysis.badRequestFound) {
            await FUF.cleanUp(req)
            return res.status(400).json(requestAnalysis.response);
        }
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
  
    const { numTf, email, nCin, taxId } = req.body;
    const signUpLoginType = req.signUpLoginType;
    const checkArrayQueries = [
        { sql: `SELECT 1 FROM ${signUpLoginType} WHERE n_cin = ?;`, params: [nCin] },
        { sql: `SELECT 1 FROM ${signUpLoginType} WHERE num_tf = ?;`, params: [numTf] },
        { sql: `SELECT 1 FROM ${signUpLoginType} WHERE email = ?;`, params: [email] },
        { sql: `SELECT 1 FROM ${signUpLoginType} WHERE num_fiscal = ?;`, params: [taxId] }

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
                    case 3:
                        conflictArrayErrors.push({ err: "le numéro fascal existe" });
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
    const signUpLoginType = req.signUpLoginType;
    const db = req.db;
  
    const salt = FUF.generateSalt(16);
    const hashedPaswd = await FUF.hashPassword(passwd, salt);
  
    const query = `INSERT INTO ${signUpLoginType}(nom_prenom,num_tf,email,passwd,n_cin,cin_recto,cin_verso${signUpLoginType == "moderateurs" ? ",browser_user_agent" : signUpLoginType === "livreur" ? ",status" : ",num_fiscal"},verifie,salt) VALUES(?,?,?,?,?,?,?,?,?,?)`;
  
    const baseArray = [
        username,
        numTf,
        email,
        hashedPaswd,
        nCin,
        await FUF.readFileToBuffer(req.files.recto[0].path),
        await FUF.readFileToBuffer(req.files.verso[0].path)
    ];
  
    const dynamicArray = signUpLoginType === "moderateurs"
        ? [...baseArray, FUF.userAgentGenerator(nCin, req.headers["user-agent"]), 0, salt]
        : signUpLoginType === "livreur"
        ? [...baseArray, "undefined", 0, salt]
        : [...baseArray, req.body.taxId , 0, salt];
  
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



const manipulationOfFealdsDetectorSingup = async (req, res, next) => {
    const bodyKeys = Object.keys(req.body);
    const requiredFields = ["username", "numTf", "passwd", "nCin"];
    const ItemsInRequestAllowed = req.signUpLoginType === "expediteur" ? [4, 5, 6] : [4, 5];

    // Check if all required fields are present
    const allRequiredFieldsPresent = requiredFields.every(field => req.body[field]);

    // Check if the number of fields is within the allowed range
    if (ItemsInRequestAllowed.includes(bodyKeys.length)) {
        if (!allRequiredFieldsPresent) {
            await FUF.cleanUp(req);
            return res.status(400).json({ error: "Manipulation in the fields occurred!" });
        }

        if (req.signUpLoginType === "expediteur") {
            // Handle specific conditions for "expediteur"
            if (bodyKeys.length === 6 && (!req.body["email"] || !req.body["taxId"])) {
                await FUF.cleanUp(req);
                return res.status(400).json({ error: "Manipulation in the fields occurred!" });
            }
        } else {
            // Handle conditions for other types
            if (bodyKeys.length === 5 && !req.body["email"]) {
                await FUF.cleanUp(req);
                return res.status(400).json({ error: "Manipulation in the fields occurred!" });
            }
        }
    } else {
        // If number of fields is not within the allowed range, return error
        await FUF.cleanUp(req);
        return res.status(400).json({ error: "Manipulation in the fields occurred!" });
    }

    next();
};

    
const authenticateUser = async (req,res,next)=> {
    const methodOfLogin = req.body.numTf ? "num_tf" : "email";
    const rowName = methodOfLogin == "num_tf" ? "numTf" : methodOfLogin
    req.methodOfLogin = methodOfLogin;
    let db;
    let row;

    try{
        db = await FUF.openDatabase(sqlite3,process.env.DATABASE_PATH,sqlite3.OPEN_READWRITE);
        req.db = db
    }catch(err){
        console.error("Database connection error:", err);
        return res.status(500).json({error: "Cannot access Database!"})
    }
    try{
        const query = `SELECT salt,passwd FROM ${req.signUpLoginType} WHERE ${methodOfLogin} = ?;`;
        row = await FUF.getItemFromDb(db,query,[req.body[rowName]]);
    }catch(err){
        console.error("Database query error:", err);
        return res.status(500).json({ error: "Database query error!" });
    }
    if(row){
        const salt = row.salt;
        const passwd = row.passwd;
        let result;
        try{
            result = await FUF.verifyPassword(req.body.passwd,salt,passwd);
        }catch(err){
            return res.status(500).json({error: "cannot verifiy passwd"});
        }
        if(result){
            let userData;
            try{
                const query = `SELECT n_cin,nom_prenom FROM ${req.signUpLoginType} WHERE ${methodOfLogin} = ?;`
                userData = await FUF.getItemFromDb(db,query,[req.body[rowName]]);

            }catch(err){
                console.error(err)
                return res.status(500).json({ error: "Database query error!" });
            }
            
            if(userData){
                const token = jwt.sign({
                    userId:req.body[rowName],
                    userIdType:methodOfLogin,
                    role:req.signUpLoginType,
                    costomUserAgent: FUF.userAgentGenerator(userData.n_cin,req.headers["user-agent"],req.signUpLoginType)
                },process.env.ACCESS_TOKEN_SECRET,{expiresIn:"60s"})
                const expires = new Date(Date.now() + 60 * 1000); // 60 seconds
                res.cookie("token",token,{secure: process.env.NODE_ENV === 'production',sameSite:  process.env.NODE_ENV ==='production' ? 'Strict' : 'Lax' , httpOnly: true , expires:expires})
                next()
            }else{
                return res.status(401).json({
                    error: `The ${methodOfLogin === "num_tf" ? "phone number" : methodOfLogin} and password combination is incorrect. Please check your credentials and try again.`
                });
            }
        }else{
            return res.status(401).json({
                error: `The ${methodOfLogin === "num_tf" ? "phone number" : methodOfLogin} and password combination is incorrect. Please check your credentials and try again.`
            });
        }
    }else{
        return res.status(401).json({
            error: `The ${methodOfLogin === "num_tf" ? "phone number" : methodOfLogin} and password combination is incorrect. Please check your credentials and try again.`
        });
    }

}


const AuthorizeUser = (req,res,next)=>{
    const token = req.cookies.token
    if(!token){
        return res.status(403).json({error:"Forbidden access!"});
    }
    jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
        if(err) return res.status(401).json({error: err.message});
        if (decoded && decoded.role) {
            req.user = decoded; // Optionally, attach decoded user information to request object
            req.dashboard = decoded.role
            next();
        } else {
            return res.status(401).json({ error: 'Invalid token' });
        }
    })
}

  module.exports = {
    signUpLoginTypeValidation,
    fileUploadValidation,
    inputValidation,
    dbConflictCheck,
    userCreation,
    manipulationOfFealdsDetectorLogin,
    manipulationOfFealdsDetectorSingup,
    inputValidationForLogin,
    authenticateUser,
    AuthorizeUser
  }