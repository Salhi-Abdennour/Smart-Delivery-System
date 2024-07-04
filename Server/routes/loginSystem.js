const express = require("express");
 
const router = express.Router();
const {manipulationOfFealdsDetectorLogin} = require("../../utility/middlewares")


router.post("/",manipulationOfFealdsDetectorLogin,async (req,res)=>{
    res.status(200).json(req.body)
})

router.get("/",(req,res)=>{
    res.send("Hey it's login")
})

module.exports = router;