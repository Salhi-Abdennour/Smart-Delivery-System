require("dotenv").config();
const express = require("express");
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const signUpSystem = require("./routes/signupSystem.js");
const loginSystem = require("./routes/loginSystem.js")
const moderatatorDashboard = require("./routes/dashboard.js")

const app = express();

app.use(helmet());

app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "connect-src https://api.themoviedb.org 'self'; default-src 'self'; base-uri 'self'; object-src 'none'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com");
  next();
});


app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.disable('x-powered-by')
app.use(cookieParser());


const PORT = process.env.PORT || 3000;

const userTypes = ['moderateurs', 'expediteur', 'livreur'];

const setupRoutes = (app, system, handler)=>{
  userTypes.forEach(userType => {
    app.use(`/${userType}-${system}`, handler)
  });
}

app.get("/", (req, res) => {
  res.send("Hello");
  console.log(req.session)
});

setupRoutes(app,'signup',signUpSystem);
setupRoutes(app,'login',loginSystem);
app.use("/dashboard",moderatatorDashboard);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

app.listen(3001, '0.0.0.0', () => {
  console.log('Server running on http://0.0.0.0:3001');
});

//test conflects 2