const express = require("express");
const dotEnv = require("dotenv").config();
const jwt = require("jsonwebtoken");
const mongodb = require("mongodb");
const mongoClient = mongodb.MongoClient;
const bcrypt = require("bcryptjs");
const cors = require("cors");
const URL = process.env.DATAB;
const DB = "capstone";
const app = express();
app.use(express.json());

app.use(
  cors({
    origin: "https://eloquent-raindrop-005f14.netlify.app",
  })
);

app.post("/admin-entry", async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db(DB);
    let salt = await bcrypt.genSalt(10);
    let hash = await bcrypt.hash(req.body.password, salt);
    req.body.password = hash;
    await db.collection("admin").insertOne(req.body);
    res.json({ message: "User updated" });
    await connection.close();
  } catch (error) {
    console.log(error);
    res.json({ message: "Something went wrong" });
  }
});
app.post("/login-verify", async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db(DB);
    let mail = await db.collection("admin").findOne({ email: req.body.email });
    let sMail = await db
      .collection("students")
      .findOne({ email: req.body.email });
    if (mail) {
      let compare1 = await bcrypt.compare(req.body.password, mail.password);
      if (compare1) {
        let token = jwt.sign({ _id: mail._id }, process.env.TOK, {
          expiresIn: "100m",
        });
        res.json({ token: token, name: mail.name, admin: true });
      } else {
        res.json({ message: "321Rejected" });
      }
    }
    if (sMail) {
      let compare2 = await bcrypt.compare(req.body.password, sMail.password);
      if (compare2) {
        let token = jwt.sign({ _id: sMail._id }, process.env.TOK, {
          expiresIn: "100m",
        });
        res.json({
          token: token,
          name: sMail.name,
          userId: sMail._id,
          admin: false,
          batch_id: sMail.batchId,
        });
      }
    }
    await connection.close();
  } catch (error) {
    console.log(error);
  }
});

let authenticate = (req, res, next) => {
  let decode = jwt.verify(req.headers.auth, process.env.TOK);
  if (decode) {
    next();
  } else {
    res.json({ message: "Unauthorized" });
  }
};

app.post("/create-collection", authenticate, async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db(DB);
    let check = await db
      .collection("batches")
      .findOne({ batchName: req.body.batchName });
    if (!check) {
      await db.collection("batches").insertOne(req.body);
      await db.createCollection(req.body.batchName);
      res.json({ message: "Batch created" });
    } else {
      res.json({ message: "This batch name already exists" });
    }
    await connection.close();
  } catch (error) {
    console.log(error);
  }
});

app.get("/give-batches", authenticate, async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db(DB);
    let batchData = await db
      .collection("batches")
      .find({}, { batchName: 1 })
      .toArray(); //get only the batch name
    res.json({ data: batchData });
    await connection.close();
  } catch (error) {
    console.log(error);
  }
});
app.post("/adding-students", authenticate, async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db(DB);
    let stuData = await db
      .collection("students")
      .findOne({ email: req.body.email });
    if (!stuData) {
      let batchData = await db
        .collection("batches")
        .findOne({ batchName: req.body.batchName });
      req.body.batchId = batchData._id;
      // let convertStudentData = JSON.stringify(studentData)
      let salt = await bcrypt.genSalt(10);
      let hash = await bcrypt.hash(req.body.password, salt);
      req.body.password = hash;
      await db.collection("students").insertOne(req.body);
      res.json({ message: "Student updated" });
    } else {
      res.json({ message: "Student already exist" });
    }
    await connection.close();
  } catch (error) {
    res.json({ message: "Something went wrong" });
    console.log(error);
  }
});
app.post("/session-update", authenticate, async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db(DB);
    let dayVerify = await db.collection("batches").findOne({
      sessionRoadMap: {
        $elemMatch: { roadMapNumber: req.body.roadMapNumber },
      },
    });
    if (dayVerify) {
      res.json({ message: `Already updated for ${req.body.roadMapNumber}` });
    } else {
      let batchName = req.body.batchName;
      delete req.body.batchName;
      await db
        .collection(`batches`)
        .findOneAndUpdate(
          { batchName: batchName },
          { $push: { sessionRoadMap: req.body } }
        );
      res.json({ message: "Session updated" });
    }
    await connection.close();
  } catch (error) {
    console.log(error);
  }
});
app.post("/students-batch", authenticate, async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db(DB);
    let batchId = await db
      .collection("batches")
      .findOne({ batchName: req.body.batchName });
    if (batchId) {
      let students = await db
        .collection("students")
        .find({ batchId: batchId._id })
        .toArray();
      res.json({ details: students });
    } else {
      res.json({ message: "Something went wrong" });
    }
    await connection.close();
  } catch (error) {
    console.log(error);
  }
});

app.get("/studentdet/:userId", authenticate, async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db(DB);
    let student = await db
      .collection("students")
      .findOne({ _id: mongodb.ObjectId(req.params.userId) });
    res.json({ data: student });
    await connection.close();
  } catch (error) {
    console.log(error);
  }
});
app.post("/assign-capstone/:userId", authenticate, async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db(DB);
    await db
      .collection("students")
      .findOneAndUpdate(
        { _id: mongodb.ObjectId(req.params.userId) },
        { $push: { capstone: req.body } }
      );
    res.json({ message: "Event updated" });
    await connection.close();
  } catch (error) {
    console.log(error);
  }
});
app.post("/assign-webcode/:userid", authenticate, async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db(DB);
    await db
      .collection("students")
      .findOneAndUpdate(
        { _id: mongodb.ObjectId(req.params.userid) },
        { $push: { webcode: req.body } }
      );
    res.json({ message: "Event updated" });
    await connection.close();
  } catch (error) {
    console.log(error);
  }
});

app.post("/add-session", authenticate, async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db(DB);
    let batchName = req.body.batchName;
    delete req.body.batchName;
    await db
      .collection(`batches`)
      .findOneAndUpdate(
        { batchName: batchName },
        { $push: { additionalSession: req.body } }
      );
    res.json({ message: "Session updated" });
    await connection.close();
  } catch (error) {
    console.log(error);
  }
});
app.get("/webcode-get", async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db(DB);
    let wCodes = await db
      .collection("students")
      .findOne({ _id: mongodb.ObjectId(req.headers.userid) });

    res.json({ data: wCodes.webcode });
    await connection.close();
  } catch (error) {
    console.log(error);
  }
});

app.put("/remove-web", authenticate, async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db(DB);
    await db
      .collection("students")
      .findOneAndUpdate(
        { _id: mongodb.ObjectId(req.body.userid) },
        { $pull: { webcode: { title: req.body.title } } }
      );
    res.json({ message: "removed" });
    await connection.close();
  } catch (error) {
    console.log(error);
  }
});
app.get("/capcode-get", async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db(DB);
    let wCodes = await db
      .collection("students")
      .findOne({ _id: mongodb.ObjectId(req.headers.userid) });

    res.json({ data: wCodes.capstone });
    await connection.close();
  } catch (error) {
    console.log(error);
  }
});
app.put("/remove-cap", authenticate, async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db(DB);
    await db
      .collection("students")
      .findOneAndUpdate(
        { _id: mongodb.ObjectId(req.body.userid) },
        { $pull: { capstone: { title: req.body.title } } }
      );
    res.json({ message: "removed" });
    await connection.close();
  } catch (error) {
    console.log(error);
  }
});

app.get("/additional-sessiondata", async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db(DB);
    let data = await db
      .collection("batches")
      .findOne({ _id: mongodb.ObjectId(req.headers.batch_id) });
    res.json({ addSess: data.additionalSession, roadMap: data.sessionRoadMap });
    await connection.close();
  } catch (error) {
    console.log(error);
  }
});

app.post("/getiing-adddata", authenticate, async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db(DB);
    let data = await db
      .collection("batches")
      .findOne({ _id: mongodb.ObjectId(req.body.batch_id) });
    if (data) {
      res.json({
        id: data._id,
        addSess: data.additionalSession,
        roadMap: data.sessionRoadMap,
      });
    }
    if (!data) {
      res.json({ message: "no data" });
    }

    await connection.close();
  } catch (error) {
    console.log(error);
    res.json({ message: "Something went wrong" });
  }
});

app.put("/remove-session", authenticate, async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db(DB);

    await db
      .collection("batches")
      .findOneAndUpdate(
        { _id: mongodb.ObjectId(req.body.userid) },
        { $pull: { additionalSession: { topic: req.body.topic } } }
      );
    res.json({ message: "removed" });
    await connection.close();
  } catch (error) {
    console.log(error);
  }
});

app.get("/spec-student", async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db(DB);
    let students = await db
      .collection("students")
      .find({ batchId: mongodb.ObjectId(req.headers.batch_id) })
      .toArray();
    res.json({ details: students });
    await connection.close();
  } catch (error) {
    console.log(error);
  }
});

app.get("/web-correction/:id", async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db(DB);
    let wCode = await db
      .collection("students")
      .findOne({ _id: mongodb.ObjectId(req.params.id) });
    res.json({ data: wCode.webcode });
    await connection.close();
  } catch (error) {
    console.log(error);
  }
});
app.get("/cap-correction/:id", async (req, res) => {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db(DB);
    let wCode = await db
      .collection("students")
      .findOne({ _id: mongodb.ObjectId(req.params.id) });
    res.json({ data: wCode.capstone });
    await connection.close();
  } catch (error) {
    console.log(error);
  }
});

app.listen(process.env.PORT || 4000);
