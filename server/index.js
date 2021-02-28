import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import connectMongoDB from './connection/connectMongoDB';
import authenticateToken from './middleware/authenticateToken';
import adminRouter from './routes/admin/index';
import adminUploadRouter from './routes/admin/upload';
import userRouter from './routes/user/index';

const app = express();
const corsOptions = {
  origin: process.env.NODE_ENV === 'development' || process.env.BASE_URL,
  credentials: true,
};

connectMongoDB();

app.use(cors(corsOptions));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

// authenticate access token
app.use(authenticateToken);

// set custom router
app.use('/admin', adminRouter);
app.use('/admin/upload', adminUploadRouter);
app.use('/user', userRouter);

export default app;
