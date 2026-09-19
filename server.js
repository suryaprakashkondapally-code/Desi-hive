const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Transporter configuration with your Gmail credentials
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'desihive.in@gmail.com',
        pass: 'chlhjsdbntqmndht'
    }
});

// Verify connection on startup
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Mail server connection error:', error);
    } else {
        console.log('✅ Desi Hive Mail Server is ready to send emails from desihive.in@gmail.com!');
    }
});

// Health check endpoint
app.get('/', (req, res) => {
    res.send('Desi Hive Backend API is active and running.');
});

// 1. SEND OTP EMAIL
app.post('/api/send-otp', async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ error: 'Email and OTP are required.' });
    }

    try {
        await transporter.sendMail({
            from: '"Desi Hive" <desihive.in@gmail.com>',
            to: email,
            subject: `${otp} is your Desi Hive Verification Code`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h1 style="color: #2563eb; margin: 0; font-size: 24px;">Desi Hive<span style="color: #f59e0b;">.in</span></h1>
                        <p style="color: #64748b; font-size: 13px; margin-top: 4px;">The Global Digital Village for People of Indian Origin</p>
                    </div>
                    <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
                    <p style="color: #334155; font-size: 15px; line-height: 1.5;">Hello,</p>
                    <p style="color: #334155; font-size: 15px; line-height: 1.5;">Use the following 4-digit verification code to complete your registration or login verification:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0f172a; background-color: #f1f5f9; padding: 12px 24px; border-radius: 12px; border: 1px dashed #cbd5e1;">${otp}</span>
                    </div>
                    <p style="color: #64748b; font-size: 13px; line-height: 1.5;">This OTP is valid for 10 minutes. Please do not share this code with anyone.</p>
                    <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
                    <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">© 2026 DesiHive.in. All rights reserved.</p>
                </div>
            `
        });
        res.json({ success: true, message: 'OTP sent successfully.' });
    } catch (err) {
        console.error('Error sending OTP email:', err);
        res.status(500).json({ error: 'Failed to send OTP email.' });
    }
});

// 2. WELCOME EMAIL (After Profile Registration)
app.post('/api/welcome', async (req, res) => {
    const { email, name, city, state } = req.body;

    if (!email) {
        console.error("❌ Welcome email failed: Email address is missing in request body.");
       return res.status(400).json({ error: 'Email is required.' });
    }

    try {
        await transporter.sendMail({
            from: '"Desi Hive Community" <desihive.in@gmail.com>',
            to: email,
            subject: `Welcome to the Hive, ${name || 'Neighbor'}! 🐝`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
                    <h2 style="color: #2563eb; margin-top: 0;">Welcome to Desi Hive, ${name}! 🐝</h2>
                    <p style="color: #334155; font-size: 15px; line-height: 1.6;">
                        Your profile is active. You are connected to the <b>${city || 'Local'}, ${state || 'Region'}</b> community hood.
                    </p>
                    <div style="background-color: #f8fafc; border-radius: 12px; padding: 16px; margin: 20px 0; border: 1px solid #e2e8f0;">
                        <h4 style="margin: 0 0 10px 0; color: #0f172a;">What you can do now:</h4>
                        <ul style="color: #475569; font-size: 14px; line-height: 1.8; padding-left: 20px; margin: 0;">
                            <li><b>🚨 Emergency SOS:</b> Hyper-local alerts mapped in real time.</li>
                            <li><b>🩸 Rakt Sewa:</b> Blood donor network for life-saving matches.</li>
                            <li><b>💼 Hiring Hive:</b> Community job portal to hire or find work.</li>
                            <li><b>🛒 Desi Bazaar:</b> Buy, sell, and barter goods locally.</li>
                        </ul>
                    </div>
                    <p style="color: #64748b; font-size: 13px;">Need help? Click the 🐝 bot icon in your dashboard to talk with Dost AI anytime.</p>
                </div>
            `
        });
        console.log(`✅ Welcome email successfully sent to: ${email}`);
        res.json({ success: true, message: 'Welcome email sent successfully.' });
    } catch (err) {
        console.error('❌ Error sending welcome email:', err);
        res.status(500).json({ error: 'Failed to send welcome email.' });
    }
});

// 3. RAKT SEWA BLOOD REQUEST EMAIL
app.post('/api/blood/request', async (req, res) => {
    const { donor_email, donor_name, from_name, blood_group, quantity, hospital_address } = req.body;

    if (!donor_email) {
        return res.status(400).json({ error: 'Donor email is required.' });
    }

    try {
        await transporter.sendMail({
            from: '"Rakt Sewa Emergency" <desihive.in@gmail.com>',
            to: donor_email,
            subject: `🚨 URGENT: Blood Request for ${blood_group || 'Blood Needed'}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 24px; border-left: 6px solid #e11d48; border-radius: 12px; background-color: #fff1f2;">
                    <h2 style="color: #be123c; margin-top: 0;">Urgent Blood Donation Request</h2>
                    <p style="color: #334155; font-size: 15px;">Dear <b>${donor_name || 'Donor'}</b>,</p>
                    <p style="color: #334155; font-size: 15px; line-height: 1.5;">
                        <b>${from_name || 'A community member'}</b> has submitted an emergency blood request matching your blood group in your area.
                    </p>
                    <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Blood Group:</td>
                            <td style="padding: 8px 0; font-weight: bold; font-size: 16px; color: #be123c;">${blood_group}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Units Needed:</td>
                            <td style="padding: 8px 0; font-weight: bold; font-size: 14px; color: #0f172a;">${quantity} unit(s)</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Hospital / Location:</td>
                            <td style="padding: 8px 0; font-weight: bold; font-size: 14px; color: #0f172a;">${hospital_address}</td>
                        </tr>
                    </table>
                    <p style="color: #475569; font-size: 13px; line-height: 1.5;">
                        If you are available to donate, please proceed to the hospital location or respond to this alert through your Desi Hive dashboard.
                    </p>
                </div>
            `
        });
        res.json({ success: true, message: 'Blood request email dispatched.' });
    } catch (err) {
        console.error('Error sending blood request email:', err);
        res.status(500).json({ error: 'Failed to send blood request email.' });
    }
});

// SOS EMERGENCY BROADCAST EMAIL
app.post('/api/sos-trigger', async (req, res) => {
    const { name, message, category, scope, mapLink, recipients, lat, lng, userCity, userState, userCountry } = req.body;

    try {
        // Ensure we have at least a fallback recipient if the network list is empty
        const emailList = recipients && recipients.length > 0 ? recipients : ['desihive.in@gmail.com'];

        await transporter.sendMail({
            from: '"Desi Hive Emergency" <desihive.in@gmail.com>',
            to: emailList.join(','), // Sends to all network users or fallback
            subject: `🚨 EMERGENCY SOS ALERT: ${category} from ${name}!`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 24px; border: 2px solid #dc2626; border-radius: 16px; background-color: #fff5f5;">
                    <h2 style="color: #dc2626; margin-top: 0;">🚨 EMERGENCY SOS BROADCAST</h2>
                    <p style="font-size: 16px; color: #1e293b;"><b>User in Distress:</b> ${name}</p>
                    <p style="font-size: 16px; color: #1e293b;"><b>Emergency Type:</b> ${category}</p>
                    <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 12px; border-radius: 4px; margin: 15px 0;">
                        <p style="margin: 0; font-size: 15px; color: #7f1d1d;"><b>Message:</b> ${message || 'No additional message provided.'}</p>
                    </div>
                    <p style="font-size: 14px; color: #475569;"><b>Location Hood:</b> ${userCity || 'Local'}, ${userState || 'Region'} (${lat}, ${lng})</p>
                    <p style="margin: 25px 0; text-align: center;">
                        <a href="${mapLink}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">📍 View Live GPS Map Location</a>
                    </p>
                    <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 20px;">This is an automated emergency broadcast from Desi Hive Network.</p>
                </div>
            `
        });

        console.log(`🚨 SOS Emergency email successfully dispatched to: ${emailList.join(', ')}`);
        res.json({ success: true, helpersFound: emailList.length });
    } catch (err) {
        console.error('❌ SOS Email Dispatch Error:', err);
        res.status(500).json({ error: 'Failed to send SOS email.' });
    }
});

// 5. HIRING HIVE JOB APPLICATION EMAIL
app.post('/api/job/apply', async (req, res) => {
    const { poster_email, poster_name, applicant_name, job_title, applicant_note } = req.body;

    const targetEmail = poster_email || 'desihive.in@gmail.com';

    try {
        await transporter.sendMail({
            from: '"Hiring Hive" <desihive.in@gmail.com>',
            to: targetEmail,
            subject: `New Application for ${job_title} from ${applicant_name}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
                    <h3 style="color: #2563eb; margin-top: 0;">New Job Application Received</h3>
                    <p style="color: #334155; font-size: 15px;">Hello <b>${poster_name || 'Hiring Lead'}</b>,</p>
                    <p style="color: #334155; font-size: 15px; line-height: 1.5;">
                        <b>${applicant_name}</b> has applied for your posted role: <b>${job_title}</b>.
                    </p>
                    <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
                        <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b; font-weight: bold; text-transform: uppercase;">Applicant Note:</p>
                        <p style="margin: 0; color: #1e293b; font-size: 14px; font-style: italic;">"${applicant_note || 'No additional note provided.'}"</p>
                    </div>
                    <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
                        You can connect directly with this candidate through your Desi Hive direct messages.
                    </p>
                </div>
            `
        });
        res.json({ success: true, message: 'Application email sent to poster.' });
    } catch (err) {
        console.error('Error sending job application email:', err);
        res.status(500).json({ error: 'Failed to send job application email.' });
    }
});

// START SERVER
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`🚀 Desi Hive Backend running on http://localhost:${PORT}`);
});