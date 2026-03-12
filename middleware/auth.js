const checkDonorAuth = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'donor') {
        next();
    } else {
        res.redirect('/auth/donor-login');
    }
};

const checkAdminAuth = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        next();
    } else {
        res.redirect('/auth/admin-login');
    }
};

module.exports = { checkDonorAuth, checkAdminAuth };