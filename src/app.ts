import dotenv from "dotenv";
import express from "express";
import bodyParser from "body-parser";
import { connectDatabase } from "./database/connectDatabase";
import vromroutes from "./route/vromroutes";
import logger from "morgan"

dotenv.config();

connectDatabase();

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(logger("dev"));

app.use("/webhook", vromroutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
