import mongoSanitize from "express-mongo-sanitize";

const sanitizePrototypePollution = (obj) => {
     if (obj === null || typeof obj !== "object") {
          return obj;
     }

     if (Array.isArray(obj)) {
          return obj.map(sanitizePrototypePollution);
     }

     const sanitized = {};
     for (const key of Object.keys(obj)) {
          if (key === "__proto__" || key === "constructor" || key === "prototype") {
               continue;
          }
          sanitized[key] = sanitizePrototypePollution(obj[key]);
     }
     return sanitized;
};

const sanitizeMongoOperators = (value) => mongoSanitize.sanitize(value);

const keepLastPollutedValue = (value) => {
     if (Array.isArray(value)) {
          return keepLastPollutedValue(value[value.length - 1]);
     }

     if (value && typeof value === "object") {
          return Object.fromEntries(
               Object.entries(value).map(([key, nestedValue]) => [key, keepLastPollutedValue(nestedValue)])
          );
     }

     return value;
};

export const sanitizeRequest = (req, res, next) => {
     if (req.body && typeof req.body === "object") {
          req.body = sanitizeMongoOperators(sanitizePrototypePollution(req.body));
     }

     if (req.params && typeof req.params === "object") {
          req.params = sanitizePrototypePollution(req.params);
     }

     const cleanQuery = sanitizeMongoOperators(sanitizePrototypePollution(keepLastPollutedValue(req.query)));

     Object.defineProperty(req, "query", {
          value: cleanQuery,
          configurable: true,
          enumerable: true,
          writable: true
     });

     next();
};
