const express = require("express");
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require('uuid');
const FUF = require("../../utility/frequent_functions.js");
const sqlite3 = require('sqlite3');


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../temp'))
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

const router = express.Router();

router.post("/", upload.fields([
  { name: 'recto', maxCount: 1 },
  { name: 'verso', maxCount: 1 }
]), async (req, res) => {
  
  const userInfo = req.body;
  const signUpType = req.baseUrl.slice(1, req.baseUrl.indexOf("-"));

  if (!FUF.postRequestTypeValidation(["moderateurs", "livreur", "expediteur"], signUpType)) {
    return res.status(400).json({ error: "Invalid signup type" });
  }

  const { username, numTf, email, passwd, nCin } = userInfo;

  const validations = [
    await FUF.handleImageUpload(req, "recto"),
    await FUF.handleImageUpload(req, "verso"),
    FUF.userNameValidator(username.trim()),
    FUF.phoneNumberAndCinValidator(numTf, "phoneNumber"),
    FUF.emailValidator(email),
    FUF.passwordValidator(passwd),
    FUF.phoneNumberAndCinValidator(nCin, "nCin")
  ];

  const requestAnalysis = FUF.customRespondBasedOnInput(validations);

  if (requestAnalysis.badRequestFound) {
    return res.status(400).json(requestAnalysis.response);
  }

  let db;

  try{
    db = FUF.openDatabase(sqlite3,process.env.DATABASE_PATH,sqlite3.OPEN_READWRITE);
  }catch(err){
    res.send(500)
  }


  const checkArrayQueries = [
    `SELECT 1 FROM ${signUpType} WHERE n_cin = ${nCin};`,
    `SELECT 1 FROM ${signUpType} WHERE num_tf = ${numTf};`,
    `SELECT 1 FROM ${signUpType} WHERE email = '${email}';`
  ]

  let conflictArrayErrors = []
  let row;
  for(let i=0;i<checkArrayQueries.length;i++){
    row = await FUF.findConflicts(checkArrayQueries[0],db)
    if(row){
      switch(i){
        case 0:
          conflictArrayErrors.push({err: "Le numéro de carte d'identité nationale existe"})
          break;
        case 1:
          conflictArrayErrors.push({err: "Le numéro de téléphone existe"})
          break;
        case 2:
          conflictArrayErrors.push({err: "l'adresse email existe"})
          break;
      }
    }
  }

  if(!row){
    const salt = FUF.generateSalt(16);
    const hashedPaswd = await FUF.hashPassword(passwd, salt);
  
    const query = `INSERT INTO ${signUpType}(nom_prenom,num_tf,email,passwd,n_cin,cin_recto,cin_verso${signUpType == "moderateurs" ? ",browser_user_agent" : signUpType === "livreur" ? ",status" : ""},verifie,salt) VALUES(?,?,?,?,?,?,?,${signUpType !==  "expediteur" ? "?," : ""}?,?);`
  
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
  
    db.run(query, dynamicArray,(err)=>{
      if(err){
        console.error(err)
      }else{
        res.status(201).json({ message: "User created successfully" });
      }
    });
      
    FUF.closeDatabase(db);
  
  }else{
    res.status(409).json(conflictArrayErrors)
  }
  
  await FUF.deleteFileFromTemp(req.files.recto[0].path);
  await FUF.deleteFileFromTemp(req.files.verso[0].path);



});

router.get("/",(req,res)=>{
  res.send("HEY")
})

module.exports = router;