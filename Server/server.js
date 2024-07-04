require("dotenv").config();
const express = require("express");
const helmet = require('helmet');
const signUpSystem = require("./routes/signupSystem.js");
const loginSystem = require("./routes/loginSystem.js")

const app = express();

app.use(helmet());

app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "connect-src https://api.themoviedb.org 'self'; default-src 'self'; base-uri 'self'; object-src 'none'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com");
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.disable('x-powered-by')


const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Hello");
});

app.use('/moderateurs-signup', signUpSystem);
app.use('/expediteur-signup', signUpSystem);
app.use('/livreur-signup', signUpSystem);

app.use("/moderateurs-login",loginSystem);
app.use("/expediteur-login",loginSystem);
app.use("/livreur-login",loginSystem);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

app.listen(PORT, () => {
  console.log(`App running on PORT ${PORT}`);
});