const express = require('express');
const app = express();
const port = 45678;
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config()

mongoose.connect(process.env.DB_URL, { useNewUrlParser: true })

const db = mongoose.connection
db.on('error', (err) => {
    console.error(err);
    console.log("DATABASE FAILURE: Read above for details.")
})

db.once('open', () => {
    console.log("Mongoose connected successfully!")
})

app.use(express.json())
app.use(cors())


// routes
const slayer = require("./routes/slayer.js")


app.use('/slayer', slayer)

app.listen(port, () => console.log('Express online at port ' + port ))