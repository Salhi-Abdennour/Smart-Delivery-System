const express = require("express");
const {
    manipulationOfFealdsDetectorLogin,
    inputValidationForLogin,
    signUpLoginTypeValidation,
    authenticateUser
} = require("../../utility/middlewares")

const router = express.Router();


router.post("/",
    signUpLoginTypeValidation,
    manipulationOfFealdsDetectorLogin,
    inputValidationForLogin,
    authenticateUser,
    async(req,res)=>{
        res.status(200).json(req.body)
    })

router.get("/",(req,res)=>{
    res.send("Hello")
})

module.exports = router;