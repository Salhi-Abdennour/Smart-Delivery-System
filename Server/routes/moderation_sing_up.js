// Require dependencies
require("dotenv").config()
const sqlite3 = require("sqlite3")
const express = require("express")
const FUF = require("../../DB/frequent_functions.js")

const router = express.Router()

//attempting to establish a DB connection
let db;

try{
    db = FUF.openDatabase(sqlite3,process.env.DATABASE_PATH,sqlite3.OPEN_READWRITE);
}catch(err){
    console.log(err)
}

//Handling sign up request 

router.get("/",(req,res)=>{
    console.log("shit")
    res.send("Hello")
})

router.post("/",(req,res)=>{
    
    userInfo = req.body

    const {
        username,
        numTf,
        email,
        passwd,
        nCin,
        cinRecto,
        cinVerso,
    } = userInfo

    res.json(FUF.userAgentGenerator(nCin,req.get("User-Agent")))
    console.log(req.body["user-agent"])
})



//attempting to terminate the DB connection
try{
    FUF.closeDatabase(db)
}catch(err){
    console.log(err)
}


module.exports = router