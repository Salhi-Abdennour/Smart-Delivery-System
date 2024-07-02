require("dotenv").config();
const express = require("express");
const helmet = require('helmet');
const signUpSystem = require("./routes/sing_up_system.js");

const app = express();

app.use(helmet());

app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "connect-src https://api.themoviedb.org 'self'; default-src 'self'; base-uri 'self'; object-src 'none'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com");
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Hello");
});

app.use('/moderateurs-sign-up', signUpSystem);
app.use('/expediteur-sign-up', signUpSystem);
app.use('/livreur-sign-up', signUpSystem);

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