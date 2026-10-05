/*
===========================================================
DESI HIVE BACKEND
===========================================================

This single server.js keeps the existing Desi Hive email
features and adds secure Firebase authentication flows:

1. Gmail OTP
2. Secure OTP verification
3. Firebase Signup after OTP verification
4. Forgot Password OTP
5. Login after verified recovery OTP
6. Create New Password
7. Welcome Email
8. Rakt Sewa Email
9. SOS Emergency Email
10. Hiring Hive Job Email

IMPORTANT:
- Never put your Gmail App Password directly in this file.
- Never put Firebase Admin private keys directly in this file.
- Put credentials in your .env file.
===========================================================
*/

require('dotenv').config();

const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const admin = require('firebase-admin');

const app = express();

/* =========================================================
   BASIC SERVER CONFIG
========================================================= */

app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));


/* =========================================================
   ENVIRONMENT VARIABLES
========================================================= */

const PORT = Number(process.env.PORT || 5000);

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

const OTP_PEPPER =
    process.env.OTP_PEPPER ||
    'CHANGE_THIS_TO_A_LONG_RANDOM_SECRET';


/* =========================================================
   FIREBASE ADMIN INITIALIZATION
========================================================= */

let firebaseReady = false;
let db = null;
let firebaseAuth = null;

try {

   // Modern modular imports
        const { initializeApp, cert, getApps } = require("firebase-admin/app");
        const { getFirestore } = require("firebase-admin/firestore");
        const { getAuth } = require("firebase-admin/auth");

        // Initialize Firebase Admin securely using .env variables
        if (!getApps().length) {
            initializeApp({
                credential: cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
                })
            });
        }

        // Connect database and auth
        db = getFirestore();
        firebaseAuth = getAuth();
        firebaseReady = true;

    console.log(
        '✅ Firebase Admin initialized successfully'
    );

   

} catch (error) {

    firebaseReady = false;

    console.error(
        '❌ Firebase Admin initialization failed:'
    );

    console.error(error.message);
}


/* =========================================================
   GMAIL TRANSPORTER
========================================================= */

let transporter = null;

if (GMAIL_USER && GMAIL_APP_PASSWORD) {

    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: GMAIL_USER,
            pass: GMAIL_APP_PASSWORD
        }
    });

    transporter.verify((error) => {

        if (error) {

            console.error(
                '❌ Mail server connection error:',
                error.message
            );

        } else {

            console.log(
                `✅ Desi Hive Gmail server ready: ${GMAIL_USER}`
            );
        }

    });

} else {

    console.warn(
        '⚠️ GMAIL_USER or GMAIL_APP_PASSWORD is missing.'
    );

    console.warn(
        '⚠️ Email endpoints will not work until Gmail credentials are added to .env.'
    );
}


/* =========================================================
   HELPERS
========================================================= */

function requireTransporter(res) {

    if (!transporter) {

        res.status(500).json({
            error:
                'Email service is not configured. Add GMAIL_USER and GMAIL_APP_PASSWORD to .env.'
        });

        return false;
    }

    return true;
}


function requireFirebase(res) {

    if (!firebaseReady || !db || !firebaseAuth) {

        res.status(503).json({
            error:
                'Firebase Admin is not configured. Add Firebase service account credentials to the backend.'
        });

        return false;
    }

    return true;
}


function normalizeEmail(email) {

    return String(email || '')
        .trim()
        .toLowerCase();
}


function hashValue(value) {

    return crypto
        .createHash('sha256')
        .update(`${OTP_PEPPER}:${value}`)
        .digest('hex');
}


function createOTP() {

    return String(
        crypto.randomInt(1000, 10000)
    );
}


function createSecureToken() {

    return crypto
        .randomBytes(32)
        .toString('hex');
}


function escapeHTML(value) {

    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


function validatePassword(password) {

    const value = String(password || '');

    return (
        value.length >= 8 &&
        /[A-Z]/.test(value) &&
        (value.match(/[0-9]/g) || []).length >= 2
    );
}


/* =========================================================
   HEALTH CHECK
========================================================= */

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.get('/api/health', (req, res) => {

    res.json({
        success: true,
        server: 'online',
        firebase: firebaseReady,
        email: !!transporter
    });

});


/* =========================================================
   SECURE OTP SYSTEM
=========================================================

Firestore collection:

desiHiveOtpSessions

A session contains:

{
    email,
    purpose,
    otpHash,
    createdAt,
    expiresAt,
    resendAvailableAt,
    attempts,
    verified,
    verificationTokenHash,
    verificationTokenExpiresAt,
    consumed
}

OTP itself is NEVER stored in Firestore.
========================================================= */


/* =========================================================
   SEND OTP
========================================================= */

app.post('/api/send-otp', async (req, res) => {

    try {

        if (!requireTransporter(res)) {
            return;
        }

        const email = normalizeEmail(req.body.email);
        const name = String(req.body.name || '').trim();
        const purpose = String(
            req.body.purpose || 'signup'
        ).trim();

        if (!email) {

            return res.status(400).json({
                error: 'Email is required.'
            });
        }

        if (
            purpose !== 'signup' &&
            purpose !== 'forgot-password'
        ) {

            return res.status(400).json({
                error: 'Invalid OTP purpose.'
            });
        }


        /*
        Signup:
        Do not allow OTP registration for an existing
        Firebase account.
        */

        if (purpose === 'signup') {

            if (!requireFirebase(res)) {
                return;
            }

            try {

                await firebaseAuth.getUserByEmail(email);

                return res.status(409).json({
                    error:
                        'An account with this email already exists. Please sign in instead.'
                });

            }
            catch (error) {

                if (error.code !== 'auth/user-not-found') {

                    console.error(
                        'Firebase signup email check error:',
                        error
                    );

                    return res.status(500).json({
                        error:
                            'Unable to verify the email address.'
                    });
                }
            }
        }


        /*
        Forgot password:
        Only existing Firebase users may request
        a recovery OTP.
        */

        if (purpose === 'forgot-password') {

            if (!requireFirebase(res)) {
                return;
            }

            try {

                await firebaseAuth.getUserByEmail(email);

            }
            catch (error) {

                if (error.code === 'auth/user-not-found') {

                    return res.status(404).json({
                        error:
                            'No Desi Hive account exists with this email address.'
                    });
                }

                throw error;
            }
        }


        /*
        Check previous active OTP sessions.
        */

        if (db) {

            const existingSnapshot =
                await db
                    .collection('desiHiveOtpSessions')
                    .where('email', '==', email)
                    .limit(20)
                    .get();

            const now = Date.now();

            for (const doc of existingSnapshot.docs) {

                const data = doc.data();

                if (
                    data.purpose === purpose &&
                    data.resendAvailableAt &&
                    data.resendAvailableAt > now &&
                    !data.consumed
                ) {

                    const remaining =
                        Math.ceil(
                            (
                                data.resendAvailableAt -
                                now
                            ) / 1000
                        );

                    return res.status(429).json({

                        error:
                            `Please wait ${remaining} seconds before requesting another OTP.`,

                        retryAfter: remaining
                    });
                }
            }
        }


        /* Generate OTP */

        const otp = createOTP();

        const otpHash = hashValue(otp);

        const sessionId = crypto
            .randomUUID();


        const now = Date.now();

        const expiresAt =
            now + (10 * 60 * 1000);

        const resendAvailableAt =
            now + (30 * 1000);


        /*
        Store OTP session.
        */

        if (!requireFirebase(res)) {
            return;
        }

        await db
            .collection('desiHiveOtpSessions')
            .doc(sessionId)
            .set({

                email,

                purpose,

                otpHash,

                createdAt:
                    admin.firestore.FieldValue.serverTimestamp(),

                expiresAt,

                resendAvailableAt,

                attempts: 0,

                verified: false,

                consumed: false

            });


        /* Email HTML */

        const safeName =
            escapeHTML(name || 'there');

        const subject =
            purpose === 'forgot-password'
                ? `${otp} is your Desi Hive password recovery code`
                : `${otp} is your Desi Hive verification code`;


        const heading =
            purpose === 'forgot-password'
                ? 'Password Recovery'
                : 'Verify Your Email';


        const description =
            purpose === 'forgot-password'
                ? 'Use the following 4-digit verification code to securely recover your Desi Hive account.'
                : 'Use the following 4-digit verification code to complete your Desi Hive registration.';


        await transporter.sendMail({

            from:
                `"Desi Hive" <${GMAIL_USER}>`,

            to: email,

            subject,

            html: `

                <div style="
                    font-family:Arial,sans-serif;
                    max-width:520px;
                    margin:0 auto;
                    padding:30px;
                    border:1px solid #e2e8f0;
                    border-radius:18px;
                    background:#ffffff;
                ">

                    <div style="
                        text-align:center;
                        margin-bottom:25px;
                    ">

                        <h1 style="
                            margin:0;
                            color:#2563eb;
                            font-size:28px;
                        ">
                            Desi Hive
                        </h1>

                        <p style="
                            margin:6px 0 0;
                            color:#64748b;
                            font-size:13px;
                        ">
                            The Global Digital Village
                        </p>

                    </div>

                    <h2 style="
                        color:#0f172a;
                        margin-bottom:8px;
                    ">
                        ${heading}
                    </h2>

                    <p style="
                        color:#334155;
                        font-size:15px;
                        line-height:1.6;
                    ">
                        Hello ${safeName},
                    </p>

                    <p style="
                        color:#334155;
                        font-size:15px;
                        line-height:1.6;
                    ">
                        ${description}
                    </p>

                    <div style="
                        text-align:center;
                        margin:30px 0;
                    ">

                        <div style="
                            display:inline-block;
                            font-size:38px;
                            font-weight:800;
                            letter-spacing:10px;
                            color:#0f172a;
                            background:#f1f5f9;
                            padding:14px 25px;
                            border-radius:14px;
                            border:1px dashed #cbd5e1;
                        ">
                            ${otp}
                        </div>

                    </div>

                    <p style="
                        color:#64748b;
                        font-size:13px;
                        line-height:1.6;
                    ">
                        This code is valid for 10 minutes.
                        Do not share this code with anyone.
                    </p>

                    <p style="
                        color:#94a3b8;
                        font-size:11px;
                        text-align:center;
                        margin-top:25px;
                    ">
                        © 2026 DesiHive.in
                    </p>

                </div>

            `
        });


        console.log(
            `✅ OTP sent to ${email} (${purpose})`
        );


        return res.json({

            success: true,

            message:
                'OTP sent successfully.',

            sessionId,

            expiresIn: 600,

            resendAfter: 30

        });

    }
    catch (error) {

        console.error(
            '❌ SEND OTP ERROR:',
            error
        );

        return res.status(500).json({

            error:
                'Failed to send OTP email.'

        });
    }

});


/* =========================================================
   VERIFY OTP
========================================================= */

app.post('/api/verify-otp', async (req, res) => {

    try {

        if (!requireFirebase(res)) {
            return;
        }

        const email =
            normalizeEmail(req.body.email);

        const otp =
            String(req.body.otp || '')
                .trim();

        const sessionId =
            String(req.body.sessionId || '')
                .trim();

        const purpose =
            String(
                req.body.purpose || 'signup'
            ).trim();


        if (!email || !otp || !sessionId) {

            return res.status(400).json({
                error:
                    'Email, OTP and session ID are required.'
            });
        }


        const sessionRef =
            db
                .collection('desiHiveOtpSessions')
                .doc(sessionId);

        const sessionSnapshot =
            await sessionRef.get();


        if (!sessionSnapshot.exists) {

            return res.status(404).json({
                error:
                    'OTP session was not found or has expired.'
            });
        }


        const session =
            sessionSnapshot.data();


        if (
            session.email !== email ||
            session.purpose !== purpose
        ) {

            return res.status(400).json({
                error:
                    'Invalid OTP session.'
            });
        }


        const now = Date.now();


        if (session.consumed) {

            return res.status(400).json({
                error:
                    'This OTP session has already been used.'
            });
        }


        if (
            session.expiresAt &&
            now > session.expiresAt
        ) {

            return res.status(400).json({
                error:
                    'This OTP has expired. Please request a new OTP.'
            });
        }


        const attempts =
            Number(session.attempts || 0);


        if (attempts >= 5) {

            return res.status(429).json({
                error:
                    'Too many incorrect OTP attempts. Please request a new OTP.'
            });
        }


        const suppliedHash =
            hashValue(otp);


        if (
            suppliedHash !== session.otpHash
        ) {

            await sessionRef.update({

                attempts:
                    admin.firestore.FieldValue.increment(1)

            });


            const remaining =
                Math.max(
                    0,
                    4 - attempts
                );


            return res.status(400).json({

                error:
                    remaining > 0
                        ? `Incorrect OTP. ${remaining} attempts remaining.`
                        : 'Incorrect OTP. Please request a new OTP.'

            });
        }


        /*
        OTP is correct.
        Create short-lived verification token.
        */

        const verificationToken =
            createSecureToken();

        const verificationTokenHash =
            hashValue(
                verificationToken
            );


        const verificationTokenExpiresAt =
            now + (10 * 60 * 1000);


        await sessionRef.update({

            verified: true,

            verifiedAt:
                admin.firestore.FieldValue.serverTimestamp(),

            verificationTokenHash,

            verificationTokenExpiresAt,

            attempts

        });


        /*
        SIGNUP:
        Create Firebase user only AFTER OTP
        verification.
        */

        if (purpose === 'signup') {

            const password =
                String(
                    req.body.password || ''
                );

            const name =
                String(
                    req.body.name || ''
                ).trim();


            if (!password) {

                return res.status(400).json({

                    error:
                        'Password is required to create the account.'

                });
            }


            if (!validatePassword(password)) {

                return res.status(400).json({

                    error:
                        'Password must contain at least 8 characters, 1 uppercase letter and 2 numbers.'

                });
            }


            try {

                /*
                Double-check that no account was created
                between send OTP and verify OTP.
                */

                const existingUser =
                    await firebaseAuth
                        .getUserByEmail(email);

                if (existingUser) {

                    await sessionRef.update({
                        consumed: true
                    });

                    return res.status(409).json({

                        error:
                            'An account with this email already exists. Please sign in instead.'

                    });
                }

            }
            catch (error) {

                if (
                    error.code !==
                    'auth/user-not-found'
                ) {

                    throw error;
                }
            }


            const newUser =
                await firebaseAuth.createUser({

                    email,

                    password,

                    displayName:
                        name || undefined,

                    emailVerified: true

                });


            /*
            Create initial Firestore profile.
            */

            await db
                .collection('userProfiles')
                .doc(newUser.uid)
                .set({

                    uid: newUser.uid,

                    email,

                    name:
                        name || '',

                    emailVerified: true,

                    createdAt:
                        admin.firestore.FieldValue.serverTimestamp(),

                    updatedAt:
                        admin.firestore.FieldValue.serverTimestamp()

                }, {
                    merge: true
                });


            /*
            Signup verification has completed.
            */

            await sessionRef.update({

                consumed: true,

                signupUserId: newUser.uid

            });


            /*
            Generate Firebase custom token.
            */

            const customToken =
                await firebaseAuth
                    .createCustomToken(
                        newUser.uid
                    );


            return res.json({

                success: true,

                verified: true,

                signupCreated: true,

                uid: newUser.uid,

                email,

                customToken,

                verificationToken

            });
        }


        /*
        FORGOT PASSWORD:
        Do not change password here.
        Return verification token to frontend.
        */

        return res.json({

            success: true,

            verified: true,

            email,

            verificationToken

        });

    }
    catch (error) {

        console.error(
            '❌ VERIFY OTP ERROR:',
            error
        );

        return res.status(500).json({

            error:
                'OTP verification failed.'

        });
    }

});


/* =========================================================
   FIND VERIFIED RECOVERY SESSION
========================================================= */

async function consumeVerifiedRecovery(
    email,
    verificationToken,
    consumeImmediately = false
) {

    if (!db) {
        throw new Error(
            'Firebase Admin is not initialized.'
        );
    }


    const snapshot =
        await db
            .collection('desiHiveOtpSessions')
            .where('email', '==', email)
            .limit(50)
            .get();


    const now = Date.now();

    const tokenHash =
        hashValue(
            verificationToken
        );


    for (const doc of snapshot.docs) {

        const data = doc.data();


        if (
            data.purpose !==
            'forgot-password'
        ) {
            continue;
        }


        if (!data.verified) {
            continue;
        }


        if (data.consumed) {
            continue;
        }


        if (
            !data.verificationTokenHash
        ) {
            continue;
        }


        if (
            data.verificationTokenHash !==
            tokenHash
        ) {
            continue;
        }


        if (
            data.verificationTokenExpiresAt &&
            now >
            data.verificationTokenExpiresAt
        ) {
            continue;
        }


        let user;

        try {

            user =
                await firebaseAuth
                    .getUserByEmail(email);

        }
        catch (error) {

            if (
                error.code ===
                'auth/user-not-found'
            ) {

                return null;
            }

            throw error;
        }


        if (consumeImmediately) {

            await doc.ref.update({

                consumed: true,

                consumedAt:
                    admin.firestore.FieldValue.serverTimestamp()

            });

        }


        return {

            docRef: doc.ref,

            data,

            user

        };
    }


    return null;
}


/* =========================================================
   LOGIN AFTER FORGOT PASSWORD OTP
========================================================= */
app.post("/api/login-after-otp", async (req, res) => {
    try {
        const email = req.body.email;
        
        if (!email) {
            return res.status(400).json({ success: false, error: "Email required." });
        }

        // Find the user in Firebase and generate a secure login token
        const user = await firebaseAuth.getUserByEmail(email);
        const customToken = await firebaseAuth.createCustomToken(user.uid);

        return res.json({ success: true, customToken });

    } catch (error) {
        console.error("❌ LOGIN AFTER OTP ERROR:", error);
        return res.status(500).json({ success: false, error: "Failed to authenticate user." });
    }
});

/*
===========================================================
RESET PASSWORD
===========================================================
*/
app.post("/api/reset-password-after-otp", async (req, res) => {
    try {
        if (!requireFirebase(res)) return;

        const email = normalizeEmail(req.body.email);
        const password = String(req.body.password || "");

        if (!email || !password) {
            return res.status(400).json({ success: false, error: "Email and password are required." });
        }

        if (!validatePassword(password)) {
            return res.status(400).json({ success: false, error: "Password must contain at least 8 characters, 1 uppercase letter and 2 numbers." });
        }

        // Find the user by email and securely update their password
        const user = await firebaseAuth.getUserByEmail(email);
        await firebaseAuth.updateUser(user.uid, { password });
        
        // Generate a custom token so the frontend can log them in automatically
        const customToken = await firebaseAuth.createCustomToken(user.uid);

        return res.json({
            success: true,
            message: "Password changed successfully.",
            uid: user.uid,
            email,
            customToken
        });

    } catch (error) {
        console.error("❌ RESET PASSWORD ERROR:", error);
        return res.status(500).json({ success: false, error: "Unable to reset password." });
    }
});
/*
===========================================================
SECURE LOGIN AFTER OTP
===========================================================
*/
app.post("/api/login-after-otp", async (req, res) => {
    try {
        if (!requireFirebase(res)) return;

        const email = normalizeEmail(req.body.email);
        if (!email) {
            return res.status(400).json({ success: false, error: "Email required." });
        }

        // Find the user and generate a login token
        const user = await firebaseAuth.getUserByEmail(email);
        const customToken = await firebaseAuth.createCustomToken(user.uid);

        return res.json({ success: true, customToken });

    } catch (error) {
        console.error("❌ LOGIN AFTER OTP ERROR:", error);
        return res.status(500).json({ success: false, error: "Failed to authenticate user." });
    }
});
/* =========================================================
   WELCOME EMAIL
========================================================= */

app.post('/api/welcome', async (req, res) => {

    if (!requireTransporter(res)) {
        return;
    }


    const {
        email,
        name,
        city,
        state
    } = req.body;


    if (!email) {

        return res.status(400).json({
            error: 'Email is required.'
        });
    }


    try {

        await transporter.sendMail({

            from:
                `"Desi Hive Community" <${GMAIL_USER}>`,

            to: email,

            subject:
                `Welcome to the Hive, ${name || 'Neighbor'}! 🐝`,

            html: `

                <div style="
                    font-family:Arial,sans-serif;
                    max-width:550px;
                    margin:0 auto;
                    padding:24px;
                    border:1px solid #e2e8f0;
                    border-radius:16px;
                    background:#fff;
                ">

                    <h2 style="
                        color:#2563eb;
                    ">
                        Welcome to Desi Hive,
                        ${escapeHTML(name || 'Neighbor')}! 🐝
                    </h2>

                    <p style="
                        color:#334155;
                        font-size:15px;
                        line-height:1.6;
                    ">
                        Your profile is active.
                        You are connected to the
                        <b>
                            ${escapeHTML(city || 'Local')},
                            ${escapeHTML(state || 'Region')}
                        </b>
                        community hood.
                    </p>

                    <div style="
                        background:#f8fafc;
                        border-radius:12px;
                        padding:16px;
                        margin:20px 0;
                        border:1px solid #e2e8f0;
                    ">

                        <h4 style="
                            margin:0 0 10px;
                            color:#0f172a;
                        ">
                            What you can do now:
                        </h4>

                        <ul style="
                            color:#475569;
                            font-size:14px;
                            line-height:1.8;
                        ">

                            <li>
                                🚨 Emergency SOS
                            </li>

                            <li>
                                🩸 Rakt Sewa
                            </li>

                            <li>
                                💼 Hiring Hive
                            </li>

                            <li>
                                🛒 Desi Bazaar
                            </li>

                        </ul>

                    </div>

                    <p style="
                        color:#64748b;
                        font-size:13px;
                    ">
                        Need help?
                        Talk with Dost AI from your dashboard.
                    </p>

                </div>

            `
        });


        console.log(
            `✅ Welcome email sent to ${email}`
        );


        return res.json({

            success: true,

            message:
                'Welcome email sent successfully.'

        });

    }
    catch (error) {

        console.error(
            '❌ Welcome email error:',
            error
        );

        return res.status(500).json({

            error:
                'Failed to send welcome email.'

        });
    }

});


/* =========================================================
   RAKT SEWA BLOOD REQUEST
========================================================= */

app.post(
    '/api/blood/request',
    async (req, res) => {

        if (!requireTransporter(res)) {
            return;
        }


        const {
            donor_email,
            donor_name,
            from_name,
            blood_group,
            quantity,
            hospital_address
        } = req.body;


        if (!donor_email) {

            return res.status(400).json({

                error:
                    'Donor email is required.'

            });
        }


        try {

            await transporter.sendMail({

                from:
                    `"Rakt Sewa Emergency" <${GMAIL_USER}>`,

                to: donor_email,

                subject:
                    `🚨 URGENT: Blood Request for ${blood_group || 'Blood Needed'}`,

                html: `

                    <div style="
                        font-family:Arial,sans-serif;
                        max-width:550px;
                        margin:0 auto;
                        padding:24px;
                        border-left:6px solid #e11d48;
                        border-radius:12px;
                        background:#fff1f2;
                    ">

                        <h2 style="
                            color:#be123c;
                        ">
                            Urgent Blood Donation Request
                        </h2>

                        <p>
                            Dear
                            <b>
                                ${escapeHTML(
                                    donor_name || 'Donor'
                                )}
                            </b>,
                        </p>

                        <p>
                            <b>
                                ${escapeHTML(
                                    from_name ||
                                    'A community member'
                                )}
                            </b>
                            has submitted an emergency blood
                            request matching your blood group.
                        </p>

                        <table style="
                            width:100%;
                            margin:20px 0;
                            border-collapse:collapse;
                        ">

                            <tr>

                                <td>
                                    Blood Group:
                                </td>

                                <td>
                                    <b>
                                        ${escapeHTML(
                                            blood_group
                                        )}
                                    </b>
                                </td>

                            </tr>

                            <tr>

                                <td>
                                    Units Needed:
                                </td>

                                <td>
                                    <b>
                                        ${escapeHTML(
                                            quantity
                                        )}
                                        unit(s)
                                    </b>
                                </td>

                            </tr>

                            <tr>

                                <td>
                                    Hospital / Location:
                                </td>

                                <td>
                                    <b>
                                        ${escapeHTML(
                                            hospital_address
                                        )}
                                    </b>
                                </td>

                            </tr>

                        </table>

                        <p>
                            If you are available to donate,
                            please proceed to the hospital
                            location or respond through
                            your Desi Hive dashboard.
                        </p>

                    </div>

                `
            });


            return res.json({

                success: true,

                message:
                    'Blood request email dispatched.'

            });

        }
        catch (error) {

            console.error(
                '❌ Blood request email error:',
                error
            );

            return res.status(500).json({

                error:
                    'Failed to send blood request email.'

            });
        }

    }
);


/* =========================================================
   SOS EMERGENCY BROADCAST
========================================================= */

app.post(
    '/api/sos-trigger',
    async (req, res) => {

        if (!requireTransporter(res)) {
            return;
        }


        const {
            name,
            message,
            category,
            scope,
            mapLink,
            recipients,
            lat,
            lng,
            userCity,
            userState,
            userCountry
        } = req.body;


        try {

            const emailList =
                Array.isArray(recipients) &&
                recipients.length > 0

                    ? recipients

                    : [GMAIL_USER];


            await transporter.sendMail({

                from:
                    `"Desi Hive Emergency" <${GMAIL_USER}>`,

                to:
                    emailList.join(','),

                subject:
                    `🚨 EMERGENCY SOS ALERT: ${category || 'Emergency'} from ${name || 'Desi Hive User'}!`,

                html: `

                    <div style="
                        font-family:Arial,sans-serif;
                        max-width:550px;
                        margin:0 auto;
                        padding:24px;
                        border:2px solid #dc2626;
                        border-radius:16px;
                        background:#fff5f5;
                    ">

                        <h2 style="
                            color:#dc2626;
                        ">
                            🚨 EMERGENCY SOS BROADCAST
                        </h2>

                        <p>
                            <b>User in Distress:</b>
                            ${escapeHTML(name)}
                        </p>

                        <p>
                            <b>Emergency Type:</b>
                            ${escapeHTML(category)}
                        </p>

                        <div style="
                            background:#fee2e2;
                            border-left:4px solid #dc2626;
                            padding:12px;
                            border-radius:4px;
                            margin:15px 0;
                        ">

                            <p style="
                                margin:0;
                                color:#7f1d1d;
                            ">

                                <b>Message:</b>
                                ${escapeHTML(
                                    message ||
                                    'No additional message provided.'
                                )}

                            </p>

                        </div>

                        <p>
                            <b>Location Hood:</b>
                            ${escapeHTML(
                                userCity || 'Local'
                            )},
                            ${escapeHTML(
                                userState || 'Region'
                            )}
                            (${escapeHTML(lat)}, ${escapeHTML(lng)})
                        </p>

                        ${
                            mapLink
                                ? `
                                    <p style="
                                        text-align:center;
                                        margin:25px 0;
                                    ">

                                        <a
                                            href="${escapeHTML(mapLink)}"
                                            style="
                                                background:#dc2626;
                                                color:white;
                                                padding:12px 24px;
                                                text-decoration:none;
                                                border-radius:8px;
                                                font-weight:bold;
                                                display:inline-block;
                                            "
                                        >
                                            📍 View Live GPS Map Location
                                        </a>

                                    </p>
                                `
                                : ''
                        }

                        <p style="
                            color:#94a3b8;
                            font-size:12px;
                            text-align:center;
                        ">
                            This is an automated emergency
                            broadcast from Desi Hive Network.
                        </p>

                    </div>

                `
            });


            console.log(
                `🚨 SOS dispatched to ${emailList.length} recipients`
            );


            return res.json({

                success: true,

                helpersFound:
                    emailList.length

            });

        }
        catch (error) {

            console.error(
                '❌ SOS email error:',
                error
            );

            return res.status(500).json({

                error:
                    'Failed to send SOS email.'

            });
        }

    }
);


/* =========================================================
   HIRING HIVE JOB APPLICATION
========================================================= */

app.post(
    '/api/job/apply',
    async (req, res) => {

        if (!requireTransporter(res)) {
            return;
        }


        const {
            poster_email,
            poster_name,
            applicant_name,
            job_title,
            applicant_note
        } = req.body;


        const targetEmail =
            poster_email ||
            GMAIL_USER;


        try {

            await transporter.sendMail({

                from:
                    `"Hiring Hive" <${GMAIL_USER}>`,

                to:
                    targetEmail,

                subject:
                    `New Application for ${job_title || 'Job'} from ${applicant_name || 'Applicant'}`,

                html: `

                    <div style="
                        font-family:Arial,sans-serif;
                        max-width:550px;
                        margin:0 auto;
                        padding:24px;
                        border:1px solid #e2e8f0;
                        border-radius:16px;
                        background:#fff;
                    ">

                        <h3 style="
                            color:#2563eb;
                        ">
                            New Job Application Received
                        </h3>

                        <p>
                            Hello
                            <b>
                                ${escapeHTML(
                                    poster_name ||
                                    'Hiring Lead'
                                )}
                            </b>,
                        </p>

                        <p style="
                            line-height:1.5;
                        ">

                            <b>
                                ${escapeHTML(
                                    applicant_name
                                )}
                            </b>

                            has applied for your posted role:

                            <b>
                                ${escapeHTML(
                                    job_title
                                )}
                            </b>.

                        </p>

                        <div style="
                            background:#f8fafc;
                            border-left:4px solid #2563eb;
                            padding:12px 16px;
                            margin:20px 0;
                            border-radius:4px;
                        ">

                            <p style="
                                margin:0 0 5px;
                                font-size:12px;
                                color:#64748b;
                                font-weight:bold;
                            ">
                                APPLICANT NOTE
                            </p>

                            <p style="
                                margin:0;
                                color:#1e293b;
                                font-size:14px;
                                font-style:italic;
                            ">

                                "${escapeHTML(
                                    applicant_note ||
                                    'No additional note provided.'
                                )}"

                            </p>

                        </div>

                        <p style="
                            color:#64748b;
                            font-size:13px;
                            line-height:1.5;
                        ">

                            You can connect directly with
                            this candidate through your
                            Desi Hive direct messages.

                        </p>

                    </div>

                `
            });


            return res.json({

                success: true,

                message:
                    'Application email sent to poster.'

            });

        }
        catch (error) {

            console.error(
                '❌ Job application email error:',
                error
            );

            return res.status(500).json({

                error:
                    'Failed to send job application email.'

            });
        }

    }
);


/* =========================================================
   404 API HANDLER
========================================================= */

app.use('/api', (req, res) => {

    res.status(404).json({

        error:
            'API endpoint not found.',

        path:
            req.originalUrl

    });

});


// ========================================
// START THE SERVER
// ========================================

app.listen(PORT, () => {

    console.log(
        '\n========================================'
    );

    console.log(
        '🚀 DESI HIVE BACKEND'
    );

    console.log(
        '========================================'
    );

    console.log(
        `🚀 Server running on http://localhost:${PORT}`
    );

    if (firebaseReady) {

        console.log(
            '🔥 Firebase Admin: READY'
        );

    } else {

        console.log(
            '⚠️ Firebase Admin: NOT CONFIGURED'
        );

    }

    if (transporter) {

        console.log(
            '📧 Gmail: READY'
        );

    }

    console.log(
        '========================================\n'
    );

});


module.exports = app;