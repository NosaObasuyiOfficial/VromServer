import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
// import { connectDatabase } from "./database/connectDatabase.js";
import vromroutes from "./route/vromroutes.js";
import logger from "morgan"

dotenv.config();
// connectDatabase();

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(logger("dev"));

app.use("/", vromroutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
