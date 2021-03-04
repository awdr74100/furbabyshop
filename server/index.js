import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import connectMongoDB from './connection/connectMongoDB';
import routes from './routes/index';

const app = express();
const corsOptions = {
  origin: process.env.NODE_ENV === 'development' || process.env.BASE_URL,
  credentials: true,
};

connectMongoDB();

app.disable('x-powered-by');

// set middleware
app.use(cors(corsOptions));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

// set routes
app.use('/', routes);

export default app;
