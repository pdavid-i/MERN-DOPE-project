const express = require('express');
const auth = require('../../middleware/auth');
const router = express.Router();
const config = require('config');
const encrypter = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator/check');

const User = require('../../models/User');

// @route   GET api/auth
// @desc    test route for users
// @access Public
router.get('/', auth, async (req, res) =>{
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/auth
// @desc    Authenticate user & get token
// @access Public
router.post('/', 
[
    check('email', 'The email given is not a valid').isEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6})
],
async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({errors: errors.array() });
    }

    const {email, password} = req.body;

    try {
        let user = await User.findOne({ email });
        
        //check if user exists
        if (!user) {
            res.status(400).json({errors: [{msg: 'There is no account associated with that email!'}]});
        }
        const salt = await encrypter.genSalt(10);

        user.password = await encrypter.hash(password, salt);

        await user.save();

        const isMatch = await encrypter.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({errors: [{msg: 'There is no account associated with that email!'}]});
        }

        const payload = {
            user: {
                id: user.id
            }
        }

        jwt.sign(payload,
        config.get('jwtSecret'),
        {expiresIn: 7200},
        (err, token) => {
            if (err) throw err;
            res.json({ token });
        }
        );

    } catch(err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router; 