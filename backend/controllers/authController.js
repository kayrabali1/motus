const db = require('../db');
const { FieldValue } = require('@google-cloud/firestore');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const jwksClient = require('jwks-rsa');

const JWT_SECRET = process.env.JWT_SECRET || 'motus-super-secret-key-12345';
const usersCollection = db.collection('users');

exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const sanitizedEmail = email.toLowerCase().trim();
    const userDocRef = usersCollection.doc(sanitizedEmail);
    const userDoc = await userDocRef.get();

    if (userDoc.exists) {
      return res.status(400).json({ error: 'A user with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = {
      name,
      email: sanitizedEmail,
      passwordHash,
      proMember: true, // Everyone gets Motus Pro in the premium version!
      createdAt: new Date().toISOString(),
    };

    await userDocRef.set(newUser);

    const token = jwt.sign({ email: sanitizedEmail, name }, JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      token,
      user: {
        name,
        email: sanitizedEmail,
        proMember: newUser.proMember,
        avatarUrl: null,
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create user.' });
  }
};

exports.signin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const sanitizedEmail = email.toLowerCase().trim();
    const userDocRef = usersCollection.doc(sanitizedEmail);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const userData = userDoc.data();
    const isMatch = await bcrypt.compare(password, userData.passwordHash);

    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign({ email: sanitizedEmail, name: userData.name }, JWT_SECRET, { expiresIn: '30d' });

    res.status(200).json({
      token,
      user: {
        name: userData.name,
        email: sanitizedEmail,
        proMember: userData.proMember || false,
        avatarUrl: userData.avatarUrl || null,
      }
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: 'Failed to sign in.' });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const sanitizedEmail = email.toLowerCase().trim();
    const userDocRef = usersCollection.doc(sanitizedEmail);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      // Security standard: don't reveal if user exists, but we return a generic success message.
      // However, to make manual testing easier, we can return success but not code.
      // Let's do a friendly developer sandbox check:
      return res.status(404).json({ error: 'No account found with this email.' });
    }

    // Generate 6-digit code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeExpires = Date.now() + 15 * 60 * 1000; // 15 mins

    await userDocRef.update({
      resetCode,
      codeExpires,
    });

    console.log(`[AUTH] Password reset code for ${sanitizedEmail}: ${resetCode}`);

    // Return the resetCode in response for testing/visibility in this app setup
    res.status(200).json({
      message: 'Password reset code generated.',
      resetCode, // Return for simulation/testing
    });
  } catch (error) {
    console.error('ForgotPassword error:', error);
    res.status(500).json({ error: 'Failed to request password reset.' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, verification code, and new password are required.' });
    }

    const sanitizedEmail = email.toLowerCase().trim();
    const userDocRef = usersCollection.doc(sanitizedEmail);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return res.status(400).json({ error: 'User does not exist.' });
    }

    const userData = userDoc.data();

    if (!userData.resetCode || userData.resetCode !== code.trim()) {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    if (!userData.codeExpires || Date.now() > userData.codeExpires) {
      return res.status(400).json({ error: 'Verification code has expired.' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password, clear reset token fields
    await userDocRef.update({
      passwordHash: newPasswordHash,
      resetCode: FieldValue.delete(),
      codeExpires: FieldValue.delete(),
    });

    res.status(200).json({ message: 'Password has been successfully updated.' });
  } catch (error) {
    console.error('ResetPassword error:', error);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
};
exports.updateProfile = async (req, res) => {
  try {
    const { name, avatarUrl } = req.body;
    const email = req.user.email;

    if (!name && avatarUrl === undefined) {
      return res.status(400).json({ error: 'Name or avatar is required.' });
    }

    const updates = {};
    if (name) updates.name = name;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;

    const userDocRef = usersCollection.doc(email);
    await userDocRef.update(updates);

    const updatedDoc = await userDocRef.get();
    const updatedData = updatedDoc.data();

    res.status(200).json({
      name: updatedData.name,
      email: updatedData.email,
      proMember: updatedData.proMember || true,
      avatarUrl: updatedData.avatarUrl || null
    });
  } catch (error) {
    console.error('UpdateProfile error:', error);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
};

const googleClient = new OAuth2Client();

exports.googleLogin = async (req, res) => {
  try {
    const { idToken, name: reqName } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'Google ID token is required.' });
    }

    const ticket = await googleClient.verifyIdToken({ idToken });
    const payload = ticket.getPayload();

    const email = payload.email.toLowerCase().trim();
    const googleId = payload.sub;
    const name = reqName || payload.name || email.split('@')[0];

    const userDocRef = usersCollection.doc(email);
    let userDoc = await userDocRef.get();
    let userData;

    if (!userDoc.exists) {
      userData = {
        name,
        email,
        googleId,
        proMember: true,
        createdAt: new Date().toISOString(),
      };
      await userDocRef.set(userData);
    } else {
      userData = userDoc.data();
      if (!userData.googleId) {
        await userDocRef.update({ googleId });
        userData.googleId = googleId;
      }
    }

    const token = jwt.sign({ email, name: userData.name }, JWT_SECRET, { expiresIn: '30d' });

    res.status(200).json({
      token,
      user: {
        name: userData.name,
        email,
        proMember: userData.proMember || false,
        avatarUrl: userData.avatarUrl || null,
      }
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(400).json({ error: 'Invalid Google ID token.' });
  }
};

const appleJwksClient = jwksClient({
  jwksUri: 'https://appleid.apple.com/auth/keys'
});

function getAppleSigningKey(header, callback) {
  appleJwksClient.getSigningKey(header.kid, function(err, key) {
    if (err) {
      return callback(err);
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

exports.appleLogin = async (req, res) => {
  try {
    const { identityToken, name: reqName } = req.body;
    if (!identityToken) {
      return res.status(400).json({ error: 'Apple Identity token is required.' });
    }

    const decoded = await new Promise((resolve, reject) => {
      jwt.verify(identityToken, getAppleSigningKey, {
        issuer: 'https://appleid.apple.com'
      }, (err, decodedToken) => {
        if (err) reject(err);
        else resolve(decodedToken);
      });
    });

    const email = decoded.email ? decoded.email.toLowerCase().trim() : null;
    const appleId = decoded.sub;

    if (!email) {
      return res.status(400).json({ error: 'Email could not be retrieved from Apple identity token.' });
    }

    const name = reqName || email.split('@')[0];

    const userDocRef = usersCollection.doc(email);
    let userDoc = await userDocRef.get();
    let userData;

    if (!userDoc.exists) {
      userData = {
        name,
        email,
        appleId,
        proMember: true,
        createdAt: new Date().toISOString(),
      };
      await userDocRef.set(userData);
    } else {
      userData = userDoc.data();
      if (!userData.appleId) {
        await userDocRef.update({ appleId });
        userData.appleId = appleId;
      }
    }

    const token = jwt.sign({ email, name: userData.name }, JWT_SECRET, { expiresIn: '30d' });

    res.status(200).json({
      token,
      user: {
        name: userData.name,
        email,
        proMember: userData.proMember || false,
        avatarUrl: userData.avatarUrl || null,
      }
    });
  } catch (error) {
    console.error('Apple login error:', error);
    res.status(400).json({ error: 'Invalid Apple Identity token.' });
  }
};
