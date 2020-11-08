const express = require('express');
const router = express.Router();
const gravatar = require('gravatar');
const config = require('config');
const encrypter = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { check, validationResult } = require('express-validator/check')

// the necessary model for this post
const User = require('../../models/User');
const { JsonWebTokenError } = require('jsonwebtoken');

// @route   POST api/users
// @desc    Register user
// @access Public
router.post('/', 
[
    check('name', 'Name is a mandatory field').notEmpty(),
    check('email', 'The email given is not a valid').isEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6})
],
async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({errors: errors.array() });
    }

    const {name, email, password} = req.body;

    try {
        let user = await User.findOne({ email });
        
        //check if user exists
        if (user) {
            res.status(400).json({errors: [{msg: 'There is already an account associated to that email!'}]});
        }

        //get users gravatar
        const avatar = gravatar.url(email, {
            s: '200',
            r: 'pg',
            d: 'mm'
        });

        user = new User({
            name, 
            email,
            avatar,
            password
        })

        const salt = await encrypter.genSalt(10);

        user.password = await encrypter.hash(password, salt);

        await user.save();

        const payload = {
            user: {
                id: user.id
            }
        }

        jwt.sign(payload,
        config.get('jwtSecret'),
        {expiresIn: 720000},
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