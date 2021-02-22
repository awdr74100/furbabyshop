import mongoose from 'mongoose';

export default async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      useCreateIndex: true,
    });
    console.log(`Connected DB: ${process.env.DATABASE_URL}`);
  } catch (error) {
    console.log(error.message);
  }
};
