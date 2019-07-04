const mongoose = require('mongoose');

let userSchema = new mongoose.Schema({
    name: String,
    email: String,
    dateCrawled: Date
});

let User = mongoose.model('User' , userSchema);

module.exports = User;