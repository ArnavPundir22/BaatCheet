const express = require("express");
const path = require("path");
const roomController = require("../controllers/room.controller");

const router = express.Router();

// Static routes
router.get("/sw.js", (req, res) =>
  res.sendFile(path.join(__dirname, "../../static/sw.js")),
);
router.get("/manifest.json", (req, res) =>
  res.sendFile(path.join(__dirname, "../../static/manifest.json")),
);
router.get("/robots.txt", (req, res) =>
  res.sendFile(path.join(__dirname, "../../static/robots.txt")),
);
router.get("/sitemap.xml", (req, res) =>
  res.sendFile(path.join(__dirname, "../../static/sitemap.xml")),
);
router.get("/google6ebffc7c3f9362cb.html", (req, res) =>
  res.sendFile(
    path.join(__dirname, "../../static/google6ebffc7c3f9362cb.html"),
  ),
);
router.get("/favicon.ico", (req, res) => res.status(404).send());
router.get("/about", (req, res) => res.render("about"));
router.get("/ping", (req, res) => res.status(200).json({ status: "alive", timestamp: new Date().toISOString() }));


// Room routes
router.get("/", roomController.renderIndex);
router.post("/", roomController.handleAction);
router.get("/join/:room_code", roomController.joinDirect);
router.get(
  "/secure/env-:encoded_room/session/sess-:encoded_user",
  roomController.renderRoom,
);

// AI API Routes
router.get("/api/room/:room_code/summary", roomController.getSummary);
router.get("/api/room/:room_code/quiz", roomController.getQuiz);

module.exports = router;

