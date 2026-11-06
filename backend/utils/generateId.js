
const Counter = require("../models/Counter");

const generateId = async (prefix) => {
  const counter = await Counter.findByIdAndUpdate(
    prefix,
    { $inc: { sequence: 1 } },
    {
      new: true,
      upsert: true
    }
  );

  const number = String(counter.sequence).padStart(3, "0");

  return `${prefix}-${number}`;
};

module.exports = generateId;
