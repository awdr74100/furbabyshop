import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import mongoConnect from './connection/mongoConnect';
import authenticateToken from './middleware/authenticateToken';
import adminRouter from './routes/admin/index';
import userRouter from './routes/user/index';

const app = express();
const corsOptions = {
  origin: process.env.NODE_ENV === 'development' || process.env.BASE_URL,
  credentials: true,
};

mongoConnect();

app.use(cors(corsOptions));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

// authenticate access token
app.use(authenticateToken);

// set custom router
app.use('/admin', adminRouter);
app.use('/user', userRouter);

export default app;
