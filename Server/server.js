// Load environment variables from a .env file into process.env
require("dotenv").config();

// Import the Express framework
const express = require("express");

// Create an Express application
const app = express();

app.use((req,res,next)=>{
    res.setHeader('Content-Security-Policy', "connect-src https://api.themoviedb.org 'self'; default-src 'self'; base-uri 'self'; object-src 'none'; script-src 'unsafe-inline' 'self'; style-src 'unsafe-inline' 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com");
    next();
})

// Middleware to parse JSON bodies from incoming requests
app.use(express.json());
// Middleware to parse URL-encoded bodies from incoming requests
app.use(express.urlencoded({ extended: true }));

// Get the port number from environment variables or default to 3000
const PORT = process.env.PORT || 3000;

// Start the server and listen on the specified port
app.listen(PORT, () => {
    console.log(`App running on PORT ${PORT}`); // Log the port number the server is running on
});

// Import the administration sign-up route
const administrationSignUp = require("./routes/moderation_sing_up");

// Use the administration sign-up route for handling requests to /administration-sing-up
app.use("/moderation-sing-up", administrationSignUp);

app.get("/",(req,res)=>{
    res.send("Hey")
})