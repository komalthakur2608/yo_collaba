'use strict';
import express from 'express';
import config from '../config/environment';
import User from '../api/user/user.model';
import Organisation from '../api/organisation/organisation.model';

// Passport Configuration
require('./local/passport').setup(User, config);
require('./localOrganisation/passport').setup(Organisation, config);
require('./google/passport').setup(User, config);

var router = express.Router();

router.use('/local', require('./local').default);
router.use('/local/organisation', require('./localOrganisation').default);
router.use('/google', require('./google').default);

export default router;
