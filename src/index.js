const express = require("express");
const app = express();
const port = 8080;

// Parse JSON bodies (as sent by API clients)
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

//--------------
const insertdata = require("./createDatabase");
insertdata();

const { connection } = require("./connector");

app.get("/totalRecovered", async (req, res) => {
  try {
    let [data] = await connection.aggregate([
      { $group: { _id: "total", recovered: { $sum: "$recovered" } } },
    ]);
    res.status(500).json({
      status: "success",
      data,
    });
  } catch (e) {
    res.status(404).json({
      status: "failed",
      message: e.message,
    });
  }
});

app.get("/totalActive", async (req, res) => {
  try {
    let [data] = await connection.aggregate([
      { $project: { recovered: { $subtract: ["$infected", "$recovered"] } } },
      { $group: { _id: "total", active: { $sum: "$recovered" } } },
    ]);
    res.status(500).json({
      status: "success",
      data,
    });
  } catch (e) {
    res.status(404).json({
      status: "failed",
      message: e.message,
    });
  }
});

app.get("/totalDeath", async (req, res) => {
  try {
    let [data] = await connection.aggregate([
      { $group: { _id: "total", death: { $sum: "$death" } } },
    ]);
    res.status(500).json({
      status: "success",
      data,
    });
  } catch (e) {
    res.status(404).json({
      status: "failed",
      message: e.message,
    });
  }
});

app.get("/hotspotStates", async (req, res) => {
  try {
    let data = await connection.aggregate([
      {
        $project: {
          state: 1,
          infected: 1,
          sub: { $subtract: ["$infected", "$recovered"] },
        },
      },
      {
        $project: {
          state: 1,
          ratenoround: { $divide: ["$sub", "$infected"] },
        },
      },
      { $project: { state: 1, rate: { $round: ["$ratenoround", 5] } } },
      { $match: { rate: { $gt: 0.1 } } },
      { $project: { state: 1, _id: 0, rate: 1 } },
      //   {
      //     $cond: {
      //       if: { $gte: ["$rate", 0.1] },
      //       then: { $project: { state: 1, rate: 1 } },
      //       else: "$$REMOVE",
      //     },
      //   },
    ]);
    res.status(500).json({
      status: "success",
      data,
    });
  } catch (e) {
    res.status(404).json({
      status: "failed",
      message: e.message,
    });
  }
});

app.get("/healthyStates", async (req, res) => {
  try {
    let data = await connection.aggregate([
      {
        $project: {
          state: 1,
          mortalityratenoround: { $divide: ["$death", "$infected"] },
        },
      },
      {
        $project: {
          state: 1,
          mortality: { $round: ["$mortalityratenoround", 5] },
        },
      },
      { $match: { mortality: { $lt: 0.005 } } },
      { $project: { state: 1, _id: 0, mortality: 1 } },
    ]);
    res.status(500).json({
      status: "success",
      data,
    });
  } catch (e) {
    res.status(404).json({
      status: "failed",
      message: e.message,
    });
  }
});

app.listen(port, () => console.log(`App listening on port ${port}!`));

module.exports = app;
