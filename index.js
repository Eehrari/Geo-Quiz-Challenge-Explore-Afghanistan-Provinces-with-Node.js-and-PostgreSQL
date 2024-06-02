const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { Pool } = require('pg');
const app = express();


const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'Afghanistan',
    password: 'postgres',
    port: 5432, // Default PostgreSQL port
});

// parser middleware
app.use(bodyParser.urlencoded({ extended: true }));

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

// Set view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Global variable to store cities
let cities = [];

// Global variable to store user's score
let userScore = 0;

// Global variable to store user's score
let hintRegion = undefined;

// Global variable to store user's score
let hintDistrict = '';
// Fetch all rows from the cities table and store them in the global variable
pool.query('SELECT * FROM districts', (error, result) => {
    if (error) {
        console.error('Error fetching cities:', error);
    } else {
        cities = result.rows;
    }
});

// Route to render index.ejs with a random district
app.get('/', (req, res) => {
    if (cities.length > 0) {
        let randomDistrict;
        if (hintRegion) {
            // If hintRegion is set, render the page with the previous district
            randomDistrict = hintDistrict;
        } else {
            // If hintRegion is not set, generate a new random district
            const randomIndex = Math.floor(Math.random() * cities.length);
            randomDistrict = cities[randomIndex].district;
        }
        res.render('index', { randomDistrict, userScore, hintRegion });
    } else {
        res.send('شهری یافت نشد!');
    }
});


app.post('/check', (req, res) => {
    const action = req.body.action;
    const userInput = req.body.cityInput;
    const district = req.body.district;

    if (action === 'check') {
        pool.query('SELECT province FROM districts WHERE district = $1', [district], (error, result) => {
            if (error) {
                console.error('خطا هنگام اجرای درخواست!', error);
                res.status(500).send('خطا!');
            } else {
                if (result.rows.length > 0) {
                    const province = result.rows[0].province;
                    hintRegion = undefined;

                    if (userInput === province) {
                        userScore++;
                        res.redirect('/');
                    } else {
                        userScore--;
                        if (userScore < 0) {
                            res.redirect('/gameover');
                        } else {
                            res.redirect('/');
                        }
                    }
                } else {
                    res.send('District not found.');
                }
            }
        });
    } else if (action === 'hint') {
        pool.query('SELECT region FROM districts WHERE district = $1', [district], (error, result) => {
            if (error) {
                console.error('خطا هنگام اجرای درخواست!', error);
                res.status(500).send('خطا!');
            } else {
                if (result.rows.length > 0) {
                    hintRegion = result.rows[0].region;
                    hintDistrict = district;
                    res.redirect('/');
                } else {
                    res.send('District not found.');
                }
            }
        });
    }
});

// Route to render gameover.ejs
app.get('/gameover', (req, res) => {
    res.render('gameover');
});

// Route to reset the game
app.post('/reset', (req, res) => {
    userScore = 0;
    hintRegion = undefined;
    res.redirect('/');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
