const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const session = require("express-session");
const axios = require("axios");
const mysql = require("mysql2");
const favicon = require("serve-favicon");

const app = express();
dotenv.config();

const conn = mysql.createConnection({
    host:process.env.MYSQL_HOST,
    user:process.env.MYSQL_USER,
    password:process.env.MYSQL_PASSWORD,
    port:process.env.MYSQL_PORT,
    database:process.env.MYSQL_DATABASE
});

const oneSecond = 1000;
const oneMinute = oneSecond * 60;
const oneHour = oneMinute * 60;
const oneDay = oneHour * 24;
const oneWeek = oneDay * 7;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(session({
    saveUninitialized:true,
    cookie:{maxAge:oneWeek},
    resave:false,
    secret:process.env.SESSION_SECRET
}));
app.use(express.static("./public"));
app.use(favicon("./public/logo40x40.png"));

app.set("view engine", "ejs");
app.set("views", "./views");

if(process.env.ENVIORNMENT == "DEVELOPMENT"){
    app.listen(process.env.PORT, process.env.HOSTNAME, (err) => {
        if(err){throw err}
        console.log("Started development server successfully✅")
    });
}else{
    app.listen((err) => {
        if(err){throw err}
        console.log("Started production server successfully✅")
    });
}

conn.connect((err) => {
    if(err){throw err}
    console.log("Connected to database successfully✅");
});

app.get("/", (req, res) => {
    if(req.session.user){
        res.render("home", {user:req.session.user});
    }else{
        res.redirect("/login");
    }
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/signup", (req, res) => {
    res.render("signup");
});

app.post("/signup", (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    const email = req.body.email;

    const random_user_id = Math.floor(Math.random()*10000000);
    const new_user = {
        user_id:random_user_id,
        username:username,
        email:email,
        password:password
    };

    const sql = `INSERT INTO users(user_id, username, email, password) VALUES(?, ?, ?, ?)`;
    conn.query(sql, [new_user.user_id, new_user.username, new_user.email, new_user.password], (err) => {
        if(err){throw err}

        req.session.user = new_user;
        res.redirect("/");
    });
});

app.post("/login", (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    const user = {
        username:username,
        password:password
    };

    const sql = `SELECT * FROM users WHERE username = "${user.username}"`;
    conn.query(sql, (err, result, field) => {
        if(err){throw err}
        for(let i = 0;i < result.length;i++){
            if(result[i].password == password){
                const logged_in_user = {
                    user_id:result[i].user_id,
                    username:result[i].username,
                    email:result[i].email,
                    password:result[i].password
                };
                req.session.user = logged_in_user;
                res.redirect("/");
            }
        }
    });
});

app.post("/search-anime", (req, res) => {
    const q = req.body.search_query;
    axios({
        method:"get",
        url:`https://api.jikan.moe/v4/anime?q=${q}&sfw`
    }).then((response) => {
        const result = response?.data;
        res.render("searched_anime", {anime:result.data});
    });
});

app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/");
});

app.get("/my-account", (req, res) => {
    if(req.session.user){
        res.render("my_account", {user:req.session.user});
    }else{
        res.redirect("/login");
    }
});