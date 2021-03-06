/*
 * Util functions to print and work with JS date objects.
 */

var dateFormat = (function setupDateFormat() {

  /*
   * Date Format 1.2.3
   * (c) 2007-2009 Steven Levithan <stevenlevithan.com>
   * MIT license
   *
   * Includes enhancements by Scott Trenda <scott.trenda.net>
   * and Kris Kowal <cixar.com/~kris.kowal/>
   *
   * Accepts a date, a mask, or a date and a mask.
   * Returns a formatted version of the given date.
   * The date defaults to the current date/time.
   * The mask defaults to dateFormat.masks.default.
   */

  // http://blog.stevenlevithan.com/archives/date-time-format

  var dateFormat = (function() {
      var	token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
          timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
          timezoneClip = /[^-+\dA-Z]/g,
          pad = function (val, len) {
              val = String(val);
              len = len || 2;
              while (val.length < len) val = "0" + val;
              return val;
          };

      // Regexes and supporting functions are cached through closure
      return function (date, mask, utc) {
          var dF = dateFormat;

          // You can't provide utc if you skip other args (use the "UTC:" mask prefix)
          if (arguments.length == 1 && Object.prototype.toString.call(date) == "[object String]" && !/\d/.test(date)) {
              mask = date;
              date = undefined;
          }

          // Passing date through Date applies Date.parse, if necessary
          date = date ? new Date(date) : new Date;
          if (isNaN(date)) throw SyntaxError("invalid date");

          mask = String(dF.masks[mask] || mask || dF.masks["default"]);

          // Allow setting the utc argument via the mask
          if (mask.slice(0, 4) == "UTC:") {
              mask = mask.slice(4);
              utc = true;
          }

          var	_ = utc ? "getUTC" : "get",
              d = date[_ + "Date"](),
          D = date[_ + "Day"](),
              m = date[_ + "Month"](),
          y = date[_ + "FullYear"](),
              H = date[_ + "Hours"](),
          M = date[_ + "Minutes"](),
              s = date[_ + "Seconds"](),
          L = date[_ + "Milliseconds"](),
              o = utc ? 0 : date.getTimezoneOffset(),
              flags = {
                  d:    d,
              dd:   pad(d),
                  ddd:  dF.i18n.dayNames[D],
                  dddd: dF.i18n.dayNames[D + 7],
                  m:    m + 1,
                  mm:   pad(m + 1),
                  mmm:  dF.i18n.monthNames[m],
                  mmmm: dF.i18n.monthNames[m + 12],
                  yy:   String(y).slice(2),
              yyyy: y,
                  h:    H % 12 || 12,
                  hh:   pad(H % 12 || 12),
                  H:    H,
              HH:   pad(H),
                  M:    M,
              MM:   pad(M),
                  s:    s,
              ss:   pad(s),
                  l:    pad(L, 3),
                  L:    pad(L > 99 ? Math.round(L / 10) : L),
                  t:    H < 12 ? "a"  : "p",
                  tt:   H < 12 ? "am" : "pm",
                  T:    H < 12 ? "A"  : "P",
                  TT:   H < 12 ? "AM" : "PM",
                  Z:    utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
                  o:    (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
                  S:    ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
              };

          return mask.replace(token, function ($0) {
              return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
          });
      };
  })();

  // Some common format strings
  dateFormat.masks = {
      "default":      "ddd mmm dd yyyy HH:MM:ss",
      shortDate:      "m/d/yy",
      mediumDate:     "mmm d, yyyy",
      longDate:       "mmmm d, yyyy",
      fullDate:       "dddd, mmmm d, yyyy",
      shortTime:      "h:MM TT",
      mediumTime:     "h:MM:ss TT",
      longTime:       "h:MM:ss TT Z",
      isoDate:        "yyyy-mm-dd",
      isoTime:        "HH:MM:ss",
      isoDateTime:    "yyyy-mm-dd'T'HH:MM:ss",
      isoUtcDateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'"
  };

  // Internationalization strings
  dateFormat.i18n = {
      dayNames: [
          "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
          "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
      ],
      monthNames: [
          "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
          "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
      ]
  };

  return dateFormat;

})(); // end of setupDateFormat


function format(date, mask, utc) {
  // Custom date / time stringifier. Provides default masks:
  //
  // Mask           | Pattern
  // ---------------|--------------------------------
  // default        | `"ddd mmm dd yyyy HH:MM:ss"`
  // shortDate      | `"m/d/yy"`
  // mediumDate     | `"mmm d, yyyy"`
  // longDate       | `"mmmm d, yyyy"`
  // fullDate       | `"dddd, mmmm d, yyyy"`
  // shortTime      | `"h:MM TT"`
  // mediumTime     | `"h:MM:ss TT"`
  // longTime       | `"h:MM:ss TT Z"`
  // isoDate        | `"yyyy-mm-dd"`
  // isoTime        | `"HH:MM:ss"`
  // isoDateTime    | `"yyyy-mm-dd'T'HH:MM:ss"`
  // isoUtcDateTime | `"UTC:yyyy-mm-dd'T'HH:MM:ss'Z'"`
  //
  // and internationalized strings via `date.format.i18n.dayNames`
  // and `date.format.i18n.dayNames`
  // Examples:
  //   date.format(new Date(), date.format.masks.longTime) // => "7:13:31 PM PDT"
  //   date.format(new Date(), "yyyy/mm/dd") // => "2014/10/09"
  return dateFormat(date, mask, utc);
}

function equals(date, otherDate) {
  // show-in-doc
  return otherDate
    && otherDate instanceof Date
    && otherDate.getTime() === date.getTime();
}

function relativeTo(date, otherDate, opts = {}) {
  // Prints a human readable difference of two Date objects. The older date
  // goes first.
  // Examples:
  //   var now = new Date();
  //   date.relativeTo(new Date(now-2000), now) // => "2 secs"
  //   date.relativeTo(new Date("10/11/2014"), new Date("10/12/2014")) // => "1 day"
  if (!(otherDate instanceof Date)) return '';
  if (otherDate < date) return '';
  if (otherDate === date) return 'now';
  var minuteString = 'min',
      secondString = 'sec',
      hourString   = 'hour',
      dayString    = 'day',
      diff         = otherDate - date,
      totalSecs    = Math.round(diff/1000),
      secs         = totalSecs % 60,
      mins         = Math.floor(totalSecs/60)%60,
      hours        = Math.floor(totalSecs/60/60)%24,
      days         = Math.floor(totalSecs/60/60/24),
      parts        = [];
  if (days > 0) {
    parts.push(days);
    if (days > 1) dayString += 's';
    parts.push(dayString);
  }
  if (opts.forceHours || (hours > 0 && days < 2)) {
    parts.push(hours);
    if (hours > 1) hourString += 's';
    parts.push(hourString);
  }
  if (opts.forceMinutes || (mins > 0 && hours < 3 && days === 0)) {
    parts.push(mins);
    if (mins > 1) minuteString += 's';
    parts.push(minuteString);
  }
  if (opts.forceSeconds || (secs > 0 && mins < 3 && hours === 0 && days === 0)) {
    parts.push(secs);
    if (secs > 1) secondString += 's';
    parts.push(secondString);
  }
  return parts.join(' ');
}

export { format, equals, relativeTo, dateFormat }
