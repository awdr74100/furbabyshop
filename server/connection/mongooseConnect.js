import mongoose from 'mongoose';

export default () => {
  return mongoose
    .connect(process.env.DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      useCreateIndex: true,
    })
    .then(() => console.log('DB Connected！'))
    .catch((err) => console.log(err));
};
