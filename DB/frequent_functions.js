const { SHA256 } = require('crypto-js');
const parser = require("ua-parser-js")

// Function to open a connection to a SQLite database
function openDatabase(sqlite3, databasePath, mod) {
    // Create a new SQLite database connection
    let db = new sqlite3.Database(databasePath, mod, (err) => {
        if (err) {
            console.error(err.message); // Log any errors that occur during the connection
        } else {
            console.log('Connected to the database successfully!'); // Log a success message if the connection is successful
        }
    });

    return db; // Return the database connection
}

// Function to close an existing SQLite database connection
function closeDatabase(db) {
    // Close the database connection
    db.close((err) => {
        if (err) {
            console.error(err.message); // Log any errors that occur during the close operation
        } else {
            console.log('Database closed successfully.'); // Log a success message if the connection is closed successfully
        }
    });
}

// Function to validate an email address using a regular expression
function emailValidatior(email) {
    const regex = /^[\w\-\.]+@([\w-]+\.)+[\w-]{2,}$/; // Regular expression to match valid email addresses
    return regex.test(email); // Return true if the email matches the regex, otherwise false
}

// Function to validate a username using a regular expression
function userNameValidatior(username) {
    const regex = /^[a-zA-Z0-9]+$/; // Regular expression to match usernames containing only letters and numbers
    return regex.test(username); // Return true if the username matches the regex, otherwise false
}

// Function to validate a phone number or CIN (presumably 8-digit format) using a regular expression
function phoneNumberAndCinValidator(phoneNumber) {
    const regex = /^\d{8}$/; // Regular expression to match an 8-digit number
    return regex.test(phoneNumber); // Return true if the phone number matches the regex, otherwise false
}

// Function to validate a password using a regular expression
function passwdValidatior(passwd) {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+{};:,<.>]).{8,}$/; // Regular expression to match passwords with at least one lowercase letter, one uppercase letter, one digit, one special character, and a minimum length of 8 characters
    return regex.test(passwd); // Return true if the password matches the regex, otherwise false
}

// Function to Generate UserAgent
function userAgentGenerator(cinNumber,userAgent){
    const Hash = SHA256(cinNumber).toString();
    const HashedNumber = parseInt(Hash.slice(0,8),16);
    const uaResult = parser(userAgent);

    const customUserAgent = `Moderator/${HashedNumber}/` +
        `${uaResult.os.name}${uaResult.os.version}/` +
        `CPU:${uaResult.cpu.architecture}/` +
        `${uaResult.engine.name}:${uaResult.engine.version}/` +
        `${uaResult.browser.name}:${uaResult.browser.version}/` +
        `${uaResult.browser.major}`;

        return customUserAgent;
};

// Export the functions so they can be used in other modules
module.exports = {
    openDatabase,
    closeDatabase,
    emailValidatior,
    passwdValidatior,
    userNameValidatior,
    phoneNumberAndCinValidator,
    userAgentGenerator
};
