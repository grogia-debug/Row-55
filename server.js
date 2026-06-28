// server.js - Row-55 Mobile Tyranny (Railway Ready)
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const chalk = require('chalk');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'row55-tyranny-secret';

// === PASTIKAN FOLDER DATABASE ADA ===
const DB_DIR = path.join(__dirname, 'database');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const SESSIONS_DIR = path.join(__dirname, 'sessions');
if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });

const AUTH_DIR = path.join(__dirname, 'auth');
if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

// === VIEW ENGINE ===
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

// === SESSION (PAKAI MEMORY STORE, KARENA RAILWAY EPHEMERAL) ===
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000,
        secure: false, // Railway pake HTTP, set false
        httpOnly: true
    }
}));

// === LOAD USER DATABASE ===
const USER_FILE = path.join(DB_DIR, 'user.json');
function getUsers() {
    try {
        if (!fs.existsSync(USER_FILE)) {
            fs.writeFileSync(USER_FILE, JSON.stringify([], null, 2));
        }
        return JSON.parse(fs.readFileSync(USER_FILE));
    } catch (e) {
        console.error(chalk.red('[ERROR] Gagal baca user.json:'), e);
        return [];
    }
}
function saveUsers(users) {
    fs.writeFileSync(USER_FILE, JSON.stringify(users, null, 2));
}

// === DEFAULT USER (gimmy) ===
function initDefaultUser() {
    let users = getUsers();
    if (!users.find(u => u.username === 'gimmy')) {
        users.push({
            username: 'gimmy',
            password: 'private_akses',
            role: 'owner',
            expired: Date.now() + (365 * 24 * 60 * 60 * 1000),
            isLoggedIn: false
        });
        saveUsers(users);
        console.log(chalk.green('[INIT] User "gimmy" created.'));
    }
}
initDefaultUser();

// === MIDDLEWARE ===
function isAuthenticated(req, res, next) {
    if (req.session.user) return next();
    res.redirect('/');
}

// === ROUTES ===

app.get('/', (req, res) => {
    if (req.session.user) return res.redirect('/dashboard');
    res.render('login', { 
        videoProfile: 'https://www.gobox.my.id/file/Ctw42iB3HzQZ.mp4',
        error: null 
    });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const users = getUsers();
    const user = users.find(u => u.username === username && u.password === password);

    if (!user) {
        return res.render('login', {
            videoProfile: 'https://www.gobox.my.id/file/Ctw42iB3HzQZ.mp4',
            error: '❌ Username atau password salah!'
        });
    }

    if (user.expired && Date.now() > user.expired) {
        return res.render('login', {
            videoProfile: 'https://www.gobox.my.id/file/Ctw42iB3HzQZ.mp4',
            error: '⏰ Akun expired! Hubungi owner.'
        });
    }

    req.session.user = user;
    res.redirect('/auth-loading');
});

app.get('/auth-loading', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    res.render('auth-loading', {
        videoAnim: 'https://www.gobox.my.id/file/Za0FheVLP1B8.mp4',
        redirectUrl: '/dashboard'
    });
});

app.get('/dashboard', isAuthenticated, (req, res) => {
    const user = req.session.user;
    const expiredDate = new Date(user.expired).toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta'
    });
    res.render('dashboard', {
        user: user,
        videoProfile: 'https://www.gobox.my.id/file/Ctw42iB3HzQZ.mp4',
        expiredDate: expiredDate,
        menuItems: [
            { name: '⚔️ Bug Attack', link: '/menu/bug' },
            { name: '🤖 Add WhatsApp Bot', link: '/menu/addbot' },
            { name: '🔧 Admin Panel', link: '/admin-panel' }
        ]
    });
});

app.get('/menu/bug', isAuthenticated, (req, res) => {
    res.render('menu', {
        title: '⚔️ Bug Attack',
        description: 'Pilih mode serangan WhatsApp.',
        modes: [
            { id: 'androdelay', label: 'X7i - CRASH HARD' },
            { id: 'androdelay2', label: 'X7i - KILL UI' },
            { id: 'iosfc', label: 'X7i - KILL IOS' }
        ],
        user: req.session.user
    });
});

app.get('/menu/addbot', isAuthenticated, (req, res) => {
    res.render('addbot', {
        title: '🤖 Add WhatsApp Bot',
        user: req.session.user
    });
});

app.get('/admin-panel', isAuthenticated, (req, res) => {
    if (req.session.user.role !== 'owner') {
        return res.render('admin-panel-auth', { error: null });
    }
    res.render('admin-panel', {
        user: req.session.user,
        users: getUsers()
    });
});

app.post('/admin-panel-auth', (req, res) => {
    const { accessCode } = req.body;
    if (accessCode === 'lowbat$$$') {
        req.session.user.role = 'admin';
        return res.redirect('/admin-panel');
    }
    res.render('admin-panel-auth', { error: '❌ Kode akses salah!' });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// === FALLBACK UNTUK ROUTE YANG GAK ADA ===
app.use((req, res) => {
    res.status(404).send('🚫 Halaman gak ketemu, kampret!');
});

// === SERVER START ===
app.listen(PORT, '0.0.0.0', () => {
    console.log(chalk.magenta(`
╔═══════════════════════════════════════╗
║   ROW-55 MOBILE TYRANNY ACTIVE 🩸     ║
╠═══════════════════════════════════════╣
║   PORT : ${PORT}                             ║
║   STATUS : ${chalk.green('ONLINE')}                    ║
║   RAILWAY : ${chalk.cyan('DEPLOYED')}               ║
╚═══════════════════════════════════════╝
    `));
});
