import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';

// import custom middleware
import authenticateToken from './middleware/authenticateToken';

// import custom router
import adminRouter from './routes/admin/index';
import userRouter from './routes/user/index';

const app = express();

const corsOptions = {
  origin: process.env.NODE_ENV === 'development' || process.env.BASE_URL,
  credentials: true,
};

mongoose.connect(process.env.DATABASE_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true,
});

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
