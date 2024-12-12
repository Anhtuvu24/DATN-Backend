const moment = require('moment-timezone');
const _ = require('lodash');

const timezoneMiddleware = (req, res, next) => {
    const oldJson = res.json;

    res.json = function (data) {
        if (data && typeof data === 'object') {
            const seen = new WeakSet();
            convertTimezone(data, seen);
        }
        oldJson.call(this, data);
    };

    next();
};

const convertTimezone = (obj, seen) => {
    _.forOwn(obj, (value, key) => {
        if (_.isDate(value)) {
            obj[key] = moment(value).tz('Asia/Ho_Chi_Minh').format();
        } else if (_.isObject(value) && !seen.has(value)) {
            seen.add(value);
            convertTimezone(value, seen);
        }
    });
};

module.exports = timezoneMiddleware;