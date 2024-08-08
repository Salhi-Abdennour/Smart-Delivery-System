const express = require("express");
const {AuthorizeUser} = require("../../utility/middlewares.js");
const router = express.Router();

router.get("/",AuthorizeUser,(req,res)=>{
    return res.status(200).json({welcome:`Welcome Back ${req.dashboard}`});
})

module.exports = router;